import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { EsignOtpChallengeEntity } from '../../database/entities/esign-otp-challenge.entity';
import type { ContractSignClaims } from './contract-sign-token';
import {
  decideEsignResend,
  esignOtpExpiresAt,
  hashEsignOtp,
  readConfiguredPositiveInt,
  readEsignOtpPepper,
  ESIGN_OTP_LOCKOUT_ENV,
  ESIGN_OTP_MAX_ATTEMPTS_ENV,
  ESIGN_OTP_RESEND_COOLDOWN_ENV,
  verifyStoredEsignOtp,
  type EsignOtpView,
} from './esign-otp-policy';

@Injectable()
export class EsignOtpChallengeService {
  constructor(
    @InjectRepository(EsignOtpChallengeEntity)
    private readonly challenges: Repository<EsignOtpChallengeEntity>,
    private readonly config: ConfigService,
  ) {}

  /** First send, or an idempotent replay of an open challenge. A real resend needs cooldown config. */
  async issue(input: {
    claims: ContractSignClaims;
    otp: string;
    now?: number;
  }): Promise<{ replay: boolean }> {
    const now = input.now ?? Date.now();
    const pepper = this.pepper();
    const latest = await this.latest(input.claims.tenantId, input.claims.jti);
    const decision = decideEsignResend({
      latestCreatedAtMs: latest ? latest.createdAt.getTime() : null,
      latestExpiresAtMs: latest ? latest.expiresAt.getTime() : null,
      latestConsumed: Boolean(latest?.consumedAt),
      now,
      cooldownSeconds: readConfiguredPositiveInt(
        (key) => this.config.get<string>(key),
        ESIGN_OTP_RESEND_COOLDOWN_ENV,
      ),
    });
    if (decision === 'replay') return { replay: true };
    if (decision === 'unconfigured') {
      throw new UnprocessableEntityException({ detail: 'esign otp resend cooldown is not configured' });
    }
    if (decision === 'cooling') {
      throw new UnprocessableEntityException({ detail: 'esign otp resend is cooling down' });
    }
    if (latest && !latest.consumedAt) {
      latest.consumedAt = new Date(now);
      await this.challenges.save(latest);
    }
    await this.challenges.save(
      this.challenges.create({
        id: `otp_${randomBytes(8).toString('hex')}`,
        tenantId: input.claims.tenantId,
        requestId: input.claims.requestId,
        signerId: input.claims.signerId,
        jti: input.claims.jti,
        otpHash: hashEsignOtp(input.otp, pepper),
        expiresAt: esignOtpExpiresAt(now),
        attempts: 0,
        lockedUntil: null,
        lockedIndefinitely: false,
        consumedAt: null,
        channel: input.claims.channel,
      }),
    );
    return { replay: false };
  }

  async verify(input: {
    tenantId: string;
    jti: string;
    otp: string;
    smsSandbox: boolean;
    now?: number;
  }): Promise<boolean> {
    const now = input.now ?? Date.now();
    const row = await this.latest(input.tenantId, input.jti);
    const result = verifyStoredEsignOtp({
      stored: row ? this.view(row) : null,
      otp: input.otp,
      now,
      pepper: readEsignOtpPepper((key) => this.config.get<string>(key)),
      maxAttempts: readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_OTP_MAX_ATTEMPTS_ENV),
      lockoutSeconds: readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_OTP_LOCKOUT_ENV),
      nodeEnv: this.config.get<string>('NODE_ENV'),
      smsSandbox: input.smsSandbox,
    });
    if (!result.ok && (result.reason === 'esign otp pepper is not configured' || result.reason === 'esign otp attempt limit is not configured' || result.reason === 'demo otp is not accepted')) {
      throw new UnprocessableEntityException({ detail: result.reason });
    }
    if (row && result.next) this.apply(row, result.next);
    if (row && result.next) await this.challenges.save(row);
    return result.ok;
  }

  private pepper(): string {
    const pepper = readEsignOtpPepper((key) => this.config.get<string>(key));
    if (!pepper) {
      throw new UnprocessableEntityException({ detail: 'esign otp pepper is not configured' });
    }
    return pepper;
  }

  private latest(tenantId: string, jti: string): Promise<EsignOtpChallengeEntity | null> {
    return this.challenges.findOne({
      where: { tenantId, jti },
      order: { createdAt: 'DESC' },
    });
  }

  private view(row: EsignOtpChallengeEntity): EsignOtpView {
    return {
      otpHash: row.otpHash,
      expiresAtMs: row.expiresAt.getTime(),
      attempts: row.attempts,
      lockedUntilMs: row.lockedUntil ? row.lockedUntil.getTime() : null,
      lockedIndefinitely: row.lockedIndefinitely,
      consumedAtMs: row.consumedAt ? row.consumedAt.getTime() : null,
    };
  }

  private apply(row: EsignOtpChallengeEntity, next: EsignOtpView): void {
    row.attempts = next.attempts;
    row.lockedIndefinitely = next.lockedIndefinitely;
    row.lockedUntil = next.lockedUntilMs === null ? null : new Date(next.lockedUntilMs);
    row.consumedAt = next.consumedAtMs === null ? null : new Date(next.consumedAtMs);
  }
}
