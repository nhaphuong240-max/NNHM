import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomInt, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BusinessErrorCode, throwBusinessError } from '../../common/business-error';
import { SavedSearchEntity } from '../../database/entities/saved-search.entity';
import { SeekerOtpChallengeEntity } from '../../database/entities/seeker-otp-challenge.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { RailResolverService } from '../tenant-config/rail-resolver.service';
import { normalizePhone } from '../crm/phone.util';
import type { JwtPayload } from './identity.types';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateOtp(sandbox: boolean): string {
  if (sandbox) return '123456';
  return String(randomInt(100000, 999999));
}

@Injectable()
export class SeekerAuthService {
  constructor(
    @InjectRepository(SeekerOtpChallengeEntity)
    private readonly challenges: Repository<SeekerOtpChallengeEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(SavedSearchEntity)
    private readonly savedSearches: Repository<SavedSearchEntity>,
    private readonly jwt: JwtService,
    private readonly rails: RailResolverService,
  ) {}

  async requestOtp(tenantId: string, phone: string, visitorId?: string) {
    const phoneNormalized = normalizePhone(phone);
    if (phoneNormalized.length < 9) {
      throwBusinessError(BusinessErrorCode.PHONE_INVALID, 'phone is invalid');
    }

    const liveRails = await this.rails.resolve(tenantId);
    const sandbox = liveRails.smsSandbox !== false;
    const code = generateOtp(sandbox);
    const codeHash = await bcrypt.hash(code, 10);

    const id = `soc_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    await this.challenges.save({
      id,
      tenantId,
      phoneNormalized,
      codeHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      verifiedAt: null,
    });

    return {
      data: {
        challengeId: id,
        expiresIn: OTP_TTL_MS / 1000,
        phoneMasked: `${phoneNormalized.slice(0, 4)}****`,
        visitorId: visitorId ?? null,
        ...(sandbox ? { sandboxHint: 'Use OTP 123456 in non-prod' } : {}),
      },
      meta: { tenantId, channel: 'sms_sandbox' },
    };
  }

  async verifyOtp(
    tenantId: string,
    input: {
      challengeId: string;
      code: string;
      phone: string;
      visitorId?: string;
      fullName?: string;
    },
  ) {
    const challenge = await this.challenges.findOne({
      where: { id: input.challengeId, tenantId },
    });
    if (!challenge || challenge.expiresAt < new Date() || challenge.verifiedAt) {
      throwBusinessError(BusinessErrorCode.SEEKER_OTP_INVALID, 'OTP expired or invalid');
    }

    if (challenge.attempts >= MAX_ATTEMPTS) {
      throwBusinessError(BusinessErrorCode.SEEKER_OTP_INVALID, 'OTP locked after too many attempts');
    }

    const phoneNormalized = normalizePhone(input.phone);
    if (phoneNormalized !== challenge.phoneNormalized) {
      throwBusinessError(BusinessErrorCode.SEEKER_OTP_INVALID, 'Phone does not match challenge');
    }

    const valid = await bcrypt.compare(input.code.trim(), challenge.codeHash);
    challenge.attempts += 1;
    if (!valid) {
      await this.challenges.save(challenge);
      throwBusinessError(BusinessErrorCode.SEEKER_OTP_INVALID, 'Invalid OTP code');
    }

    challenge.verifiedAt = new Date();
    await this.challenges.save(challenge);

    let user = await this.users.findOne({
      where: { tenantId, email: `seeker+${phoneNormalized}@nnhn.local` },
    });
    if (!user) {
      const id = `usr_seek_${randomUUID().replace(/-/g, '').slice(0, 6)}`;
      user = await this.users.save({
        id,
        tenantId,
        email: `seeker+${phoneNormalized}@nnhn.local`,
        role: 'SEEKER',
        passwordHash: await bcrypt.hash(randomUUID(), 10),
        isActive: true,
        organizationId: null,
      });
    }

    if (input.visitorId?.trim()) {
      await this.mergeVisitorSearches(tenantId, input.visitorId.trim(), user.id);
    }

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };
    const accessToken = this.jwt.sign(payload);

    return {
      data: {
        accessToken,
        userId: user.id,
        role: user.role,
        phoneHash: createHash('sha256').update(phoneNormalized).digest('hex').slice(0, 16),
      },
      meta: { mergedVisitor: Boolean(input.visitorId) },
    };
  }

  private async mergeVisitorSearches(tenantId: string, visitorId: string, userId: string) {
    const rows = await this.savedSearches.find({ where: { tenantId, visitorId } });
    for (const row of rows) {
      row.userId = userId;
      await this.savedSearches.save(row);
    }
  }
}
