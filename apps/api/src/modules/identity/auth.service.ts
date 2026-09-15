import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { RailResolverService } from '../tenant-config/rail-resolver.service';
import type {
  AuthUser,
  JwtPayload,
  LoginInput,
  LoginResponseData,
  LoginResult,
  MeResult,
  MfaVerifyInput,
  RefreshInput,
} from './identity.types';
import { MFA_LOGIN_ROLES } from './identity.types';
import { MfaChallengeStore } from './mfa-challenge.store';
import { RefreshTokenStore } from './refresh-token.store';
import { RoleService } from './role.service';
import { TenantService } from './tenant.service';
import { verifyTotp } from './mfa-totp.util';

const MFA_CHALLENGE_TTL_SEC = 300;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokens: RefreshTokenStore,
    private readonly tenants: TenantService,
    private readonly rails: RailResolverService,
    private readonly mfaChallenges: MfaChallengeStore,
    private readonly roles: RoleService,
  ) {}

  async login(input: LoginInput): Promise<{ data: LoginResponseData }> {
    const email = input.email.trim().toLowerCase();
    const user = await this.users.findOne({ where: { email } });

    if (!user?.isActive) {
      throw new UnauthorizedException({ detail: 'Invalid email or password' });
    }

    if (input.tenantId && input.tenantId !== user.tenantId) {
      throw new UnauthorizedException({ detail: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException({ detail: 'Invalid email or password' });
    }

    const liveRails = await this.rails.resolve(user.tenantId);
    const requiresMfa =
      !liveRails.mfaSandbox && (MFA_LOGIN_ROLES as readonly string[]).includes(user.role);

    if (requiresMfa) {
      const challengeId = this.mfaChallenges.issue(user.id, user.tenantId, MFA_CHALLENGE_TTL_SEC);
      return {
        data: {
          mfaRequired: true,
          challengeId,
          email: user.email,
          tenantId: user.tenantId,
          role: user.role,
          expiresIn: MFA_CHALLENGE_TTL_SEC,
        },
      };
    }

    return { data: await this.issueTokens(user) };
  }

  async refresh(input: RefreshInput): Promise<{ data: LoginResult }> {
    const stored = this.refreshTokens.consume(input.refreshToken);
    if (!stored) {
      throw new UnauthorizedException({ detail: 'Invalid or expired refresh token' });
    }

    const user = await this.users.findOne({ where: { id: stored.userId, isActive: true } });
    if (!user || user.tenantId !== stored.tenantId) {
      throw new UnauthorizedException({ detail: 'Invalid refresh token' });
    }

    this.refreshTokens.revoke(input.refreshToken);
    return { data: await this.issueTokens(user) };
  }

  logout(refreshToken: string): void {
    this.refreshTokens.revoke(refreshToken);
  }

  /** GET /auth/me — session profile + tenant context */
  async getMe(user: AuthUser): Promise<{ data: MeResult }> {
    const entity = await this.users.findOne({ where: { id: user.userId, isActive: true } });
    if (!entity) {
      throw new UnauthorizedException({ detail: 'User not found' });
    }

    const tenant = await this.tenants.getTenant(user.tenantId);

    return {
      data: {
        user: {
          id: entity.id,
          email: entity.email,
          tenantId: entity.tenantId,
          roles: [entity.role],
        },
        tenant: tenant.data,
        permissions: this.roles.getPermissionsForRole(entity.tenantId, entity.role),
      },
    };
  }

  /**
   * UC-ID-03 step-up — sandbox OTP or TOTP.
   * Tenant `LIVE_RAILS.mfaSandbox` wins over process `MFA_SANDBOX`.
   * Login challenges (`challengeId`) issue JWT after a valid OTP.
   */
  async verifyMfa(input: MfaVerifyInput): Promise<{
    data: {
      verified: boolean;
      expiresIn: number;
      mode: 'SANDBOX' | 'TOTP';
      accessToken?: string;
      refreshToken?: string;
      tokenType?: 'Bearer';
      user?: LoginResult['user'];
    };
  }> {
    const otp = input.mfaOtp.replace(/\D/g, '');
    let user: UserEntity | null = null;

    if (input.challengeId) {
      const challenge = this.mfaChallenges.peek(input.challengeId);
      if (!challenge) {
        throw new UnauthorizedException({ detail: 'Invalid or expired MFA challenge' });
      }
      user = await this.users.findOne({ where: { id: challenge.userId, isActive: true } });
      if (!user || user.tenantId !== challenge.tenantId) {
        throw new UnauthorizedException({ detail: 'Invalid MFA challenge' });
      }
    } else if (input.email?.trim()) {
      user = await this.users.findOne({
        where: { email: input.email.trim().toLowerCase(), isActive: true },
      });
    }

    const sandbox = user
      ? (await this.rails.resolve(user.tenantId)).mfaSandbox
      : this.config.get<string>('MFA_SANDBOX', 'true') !== 'false';

    if (otp === '123456' && !sandbox) {
      throw new UnauthorizedException({ detail: 'Demo OTP 123456 is not accepted' });
    }

    if (sandbox) {
      if (otp !== '123456') {
        throw new UnauthorizedException({ detail: 'Invalid MFA OTP' });
      }
      return this.finishMfa(user, input.challengeId, 'SANDBOX');
    }

    if (!user) {
      throw new UnprocessableEntityException({
        detail: 'email or challengeId required when MFA sandbox is off',
      });
    }

    if (!user.mfaSecret) {
      throw new UnauthorizedException({ detail: 'MFA TOTP not configured for user' });
    }

    if (!verifyTotp(user.mfaSecret, otp)) {
      throw new UnauthorizedException({ detail: 'Invalid MFA OTP' });
    }

    return this.finishMfa(user, input.challengeId, 'TOTP');
  }

  assertTenantAccess(user: AuthUser, headerTenantId?: string): string {
    if (headerTenantId && headerTenantId !== user.tenantId) {
      throw new ForbiddenException({
        type: 'https://wereal.dev/problems/cross-tenant',
        title: 'Cross-tenant access denied',
        detail: 'X-Tenant-Id does not match authenticated tenant',
      });
    }
    return user.tenantId;
  }

  hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }

  /** UC-ID-06 — issue JWT after verified OIDC callback */
  async loginViaSsoEmail(tenantId: string, email: string): Promise<{ data: LoginResult }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findOne({
      where: { email: normalized, tenantId, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException({
        detail: `SSO user ${normalized} not provisioned in tenant ${tenantId}`,
      });
    }
    return { data: await this.issueTokens(user) };
  }

  private async finishMfa(
    user: UserEntity | null,
    challengeId: string | undefined,
    mode: 'SANDBOX' | 'TOTP',
  ) {
    if (challengeId) {
      if (!user) {
        throw new UnauthorizedException({ detail: 'Invalid MFA challenge' });
      }
      this.mfaChallenges.consume(challengeId);
      const tokens = await this.issueTokens(user);
      return { data: { ...tokens, verified: true as const, mode } };
    }
    return { data: { verified: true as const, expiresIn: 900, mode } };
  }

  private async issueTokens(user: UserEntity): Promise<LoginResult> {
    const expiresIn = Number(this.config.get('JWT_EXPIRES_IN', 900)) || 900;
    const refreshTtl = Number(this.config.get('JWT_REFRESH_EXPIRES_IN', 604800)) || 604800;

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = await this.jwt.signAsync(payload, { expiresIn });
    const refreshToken = this.refreshTokens.issue(user.id, user.tenantId, refreshTtl);

    return {
      accessToken,
      expiresIn,
      refreshToken,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        roles: [user.role],
      },
    };
  }
}
