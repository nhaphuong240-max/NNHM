import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../../database/entities/user.entity';
import { RailResolverService } from '../tenant-config/rail-resolver.service';
import { AuthService } from './auth.service';
import { isMfaChallengeResult } from './identity.types';
import { MfaChallengeStore } from './mfa-challenge.store';
import { generateTotp } from './mfa-totp.util';
import { RefreshTokenStore } from './refresh-token.store';
import { TenantService } from './tenant.service';

describe('AuthService', () => {
  let service: AuthService;
  const passwordHash = bcrypt.hashSync('Agent123!', 10);
  const adminPasswordHash = bcrypt.hashSync('DevAdmin123!', 10);

  const mockUser = {
    id: 'usr_agent_01',
    tenantId: 'ten_dev_01',
    email: 'agent@sunrise-dev.vn',
    passwordHash,
    role: 'AGENT',
    isActive: true,
    mfaSecret: null as string | null,
  };

  const mockAdmin = {
    id: 'usr_pilot_cdt_admin',
    tenantId: 'ten_pilot_cdt_01',
    email: 'pilot@thanglong-dev.vn',
    passwordHash: adminPasswordHash,
    role: 'DEVELOPER_ADMIN',
    isActive: true,
    mfaSecret: 'JBSWY3DPEHPK3PXP',
  };

  const usersByEmail = new Map<string, typeof mockUser | typeof mockAdmin>([
    [mockUser.email, mockUser],
    [mockAdmin.email, mockAdmin],
  ]);

  const railsByTenant = new Map<string, { mfaSandbox: boolean }>([
    ['ten_dev_01', { mfaSandbox: true }],
    ['ten_pilot_cdt_01', { mfaSandbox: false }],
  ]);

  const tenantService = {
    getTenant: jest.fn().mockResolvedValue({
      data: {
        id: 'ten_dev_01',
        attributes: {
          name: 'Sunrise Development (Pilot)',
          type: 'DEVELOPER',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        RefreshTokenStore,
        MfaChallengeStore,
        { provide: TenantService, useValue: tenantService },
        {
          provide: RailResolverService,
          useValue: {
            resolve: jest.fn(async (tenantId: string) => railsByTenant.get(tenantId) ?? { mfaSandbox: true }),
          },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
              if (where.email) return usersByEmail.get(where.email) ?? null;
              if (where.id === mockAdmin.id) return mockAdmin;
              if (where.id === mockUser.id) return mockUser;
              return null;
            }),
          },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('jwt-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: unknown) => {
              if (key === 'JWT_EXPIRES_IN') return 900;
              if (key === 'JWT_REFRESH_EXPIRES_IN') return 604800;
              if (key === 'MFA_SANDBOX') return 'true';
              return fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('login returns access and refresh tokens', async () => {
    const result = await service.login({
      email: 'agent@sunrise-dev.vn',
      password: 'Agent123!',
    });

    expect(isMfaChallengeResult(result.data)).toBe(false);
    if (isMfaChallengeResult(result.data)) return;
    expect(result.data.accessToken).toBe('jwt-token');
    expect(result.data.user.roles).toContain('AGENT');
  });

  it('login rejects invalid password', async () => {
    await expect(
      service.login({ email: 'agent@sunrise-dev.vn', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('DEVELOPER_ADMIN on live-rail tenant gets MFA challenge, not JWT', async () => {
    const result = await service.login({
      email: 'pilot@thanglong-dev.vn',
      password: 'DevAdmin123!',
    });
    expect(isMfaChallengeResult(result.data)).toBe(true);
    if (!isMfaChallengeResult(result.data)) return;
    expect(result.data.challengeId).toMatch(/^mfa_/);
    expect(result.data.mfaRequired).toBe(true);
  });

  it('assertTenantAccess blocks cross-tenant header', () => {
    expect(() =>
      service.assertTenantAccess(
        { userId: 'u1', email: 'a@b.vn', tenantId: 'ten_a', role: 'AGENT' },
        'ten_b',
      ),
    ).toThrow(ForbiddenException);
  });

  it('getMe returns user and tenant context', async () => {
    const result = await service.getMe({
      userId: 'usr_agent_01',
      email: 'agent@sunrise-dev.vn',
      tenantId: 'ten_dev_01',
      role: 'AGENT',
    });
    expect(result.data.tenant.id).toBe('ten_dev_01');
    expect(result.data.permissions).toContain('bookings.write');
  });

  it('verifyMfa accepts demo OTP in sandbox', async () => {
    const result = await service.verifyMfa({ mfaOtp: '123456' });
    expect(result.data.verified).toBe(true);
    expect(result.data.mode).toBe('SANDBOX');
    expect(result.data.accessToken).toBeUndefined();
  });

  it('verifyMfa rejects 123456 when tenant mfaSandbox=false', async () => {
    await expect(
      service.verifyMfa({ mfaOtp: '123456', email: 'pilot@thanglong-dev.vn' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('verifyMfa TOTP + challengeId issues tokens', async () => {
    const challenge = await service.login({
      email: 'pilot@thanglong-dev.vn',
      password: 'DevAdmin123!',
    });
    if (!isMfaChallengeResult(challenge.data)) {
      throw new Error('expected MFA challenge');
    }

    const otp = generateTotp('JBSWY3DPEHPK3PXP');
    const result = await service.verifyMfa({
      challengeId: challenge.data.challengeId,
      mfaOtp: otp,
    });
    expect(result.data.verified).toBe(true);
    expect(result.data.mode).toBe('TOTP');
    expect(result.data.accessToken).toBe('jwt-token');
    expect(result.data.user?.roles).toContain('DEVELOPER_ADMIN');
  });
});
