import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { EsignOtpChallengeEntity } from '../../database/entities/esign-otp-challenge.entity';
import { SignatureEventEntity } from '../../database/entities/signature-event.entity';
import type { ContractSignClaims } from './contract-sign-token';
import {
  CONSUME_OTP_SQL,
  SELECT_SCOPED_CHALLENGES_SQL,
  SELECT_SIGNER_BUDGET_SQL,
  UPDATE_ATTEMPT_SQL,
  returnedRows,
} from './esign-otp-atomic';
import {
  decideEsignResend,
  demoEsignOtpRejected,
  esignOtpExpiresAt,
  hashEsignOtp,
  readConfiguredPositiveInt,
  readEsignOtpPepper,
  safeSignatureMetadata,
  ESIGN_OTP_LOCKOUT_ENV,
  ESIGN_OTP_MAX_ATTEMPTS_ENV,
  ESIGN_OTP_RESEND_COOLDOWN_ENV,
  verifyStoredEsignOtp,
  type EsignOtpView,
} from './esign-otp-policy';
import { decideScopedAttempt, type ScopedChallenge } from './esign-otp-scope';

export type AttemptOutcome =
  | { kind: 'matched' }
  | { kind: 'refused'; detail: string }
  | { kind: 'lost' };

@Injectable()
export class EsignOtpChallengeService {
  constructor(
    @InjectRepository(EsignOtpChallengeEntity)
    private readonly challenges: Repository<EsignOtpChallengeEntity>,
    private readonly config: ConfigService,
    @InjectRepository(SignatureEventEntity)
    private readonly events?: Repository<SignatureEventEntity>,
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  readConfig(key: string): string | undefined {
    return this.config.get<string>(key);
  }

  /** Pepper and the attempt limit. Call this before any SMS send. */
  assertReadyToIssue(): void {
    if (!readEsignOtpPepper((key) => this.config.get<string>(key))) {
      throw new UnprocessableEntityException({ detail: 'esign otp pepper is not configured' });
    }
    if (readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_OTP_MAX_ATTEMPTS_ENV) === null) {
      throw new UnprocessableEntityException({ detail: 'esign otp attempt limit is not configured' });
    }
  }

  /** Owner 28/11: sends are not capped. Cooldown still gates resend. */
  async assertSendBudget(claims: ContractSignClaims): Promise<void> {
    void claims;
  }

  findLatest(tenantId: string, jti: string): Promise<EsignOtpChallengeEntity | null> {
    return this.latest(tenantId, jti);
  }

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
        otpHash: hashEsignOtp(input.otp, pepper, input.claims.jti),
        expiresAt: esignOtpExpiresAt(now),
        attempts: 0,
        lockedUntil: null,
        lockedIndefinitely: false,
        consumedAt: null,
        channel: input.claims.channel,
      }),
    );
    await this.note(input.claims, 'OTP_SENT', { jti: input.claims.jti }, now);
    return { replay: false };
  }

  /**
   * One transaction: conditional attempt update, then consume only when the code matches.
   * The caller commits a mismatch so the attempt is kept, and rolls back when signing fails.
   */
  async takeAttempt(
    runner: QueryRunner,
    claims: ContractSignClaims,
    otp: string,
    now = Date.now(),
  ): Promise<AttemptOutcome> {
    const pepper = readEsignOtpPepper((key) => this.config.get<string>(key));
    if (!pepper) {
      throw new UnprocessableEntityException({ detail: 'esign otp pepper is not configured' });
    }
    const maxAttempts = readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_OTP_MAX_ATTEMPTS_ENV);
    if (maxAttempts === null) {
      throw new UnprocessableEntityException({ detail: 'esign otp attempt limit is not configured' });
    }
    const nodeEnv = this.config.get<string>('NODE_ENV');
    if (
      demoEsignOtpRejected({
        otp,
        nodeEnv,
        smsSandbox: (this.config.get<string>('SMS_SANDBOX') ?? '').trim() === 'true',
        emailSandbox: this.config.get<string>('EMAIL_SANDBOX')?.trim() === 'true',
        channel: claims.channel,
      })
    ) {
      throw new UnprocessableEntityException({ detail: 'demo otp is not accepted' });
    }
    const current = returnedRows(
      await runner.query(SELECT_SCOPED_CHALLENGES_SQL, [claims.tenantId, claims.jti]),
    );
    const budget = returnedRows(
      await runner.query(SELECT_SIGNER_BUDGET_SQL, [claims.tenantId, claims.contractId, claims.buyerId]),
    );
    const byId = new Map<string, Record<string, unknown>>();
    for (const row of [...budget, ...current]) {
      const record = row as Record<string, unknown>;
      byId.set(String(record.id), record);
    }
    const decision = decideScopedAttempt({
      rows: [...byId.values()].map((row) => this.scoped(row)),
      jti: claims.jti,
      now,
      maxAttempts,
      lockoutSeconds: readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_OTP_LOCKOUT_ENV),
      otp,
      pepper,
    });
    if (decision.action === 'refuse') {
      if (decision.lockedEvent) await this.noteOn(runner, claims, 'OTP_LOCKED', { jti: claims.jti }, now);
      return { kind: 'refused', detail: decision.detail };
    }
    const updated = returnedRows(
      await runner.query(UPDATE_ATTEMPT_SQL, [
        decision.id,
        decision.attempts,
        decision.lockedUntil,
        decision.lockedIndefinitely,
        claims.tenantId,
        maxAttempts,
        decision.previousAttempts,
      ]),
    );
    if (updated.length !== 1) return { kind: 'lost' };
    if (!decision.match) {
      await this.noteOn(runner, claims, 'OTP_FAILED', { jti: claims.jti, attempts: decision.attempts }, now);
      if (decision.locked) await this.noteOn(runner, claims, 'OTP_LOCKED', { jti: claims.jti }, now);
      return { kind: 'refused', detail: 'Invalid OTP' };
    }
    const consumed = returnedRows(await runner.query(CONSUME_OTP_SQL, [decision.id, claims.tenantId]));
    if (consumed.length !== 1) return { kind: 'lost' };
    return { kind: 'matched' };
  }

  async verify(input: {
    tenantId: string;
    jti: string;
    otp: string;
    smsSandbox: boolean;
    emailSandbox?: boolean;
    channel?: 'EMAIL' | 'SMS' | 'ZALO';
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
      emailSandbox: input.emailSandbox,
      channel: input.channel ?? (row?.channel as 'EMAIL' | 'SMS' | 'ZALO' | undefined),
      binding: input.jti,
    });
    if (
      !result.ok &&
      (result.reason === 'esign otp pepper is not configured' ||
        result.reason === 'esign otp attempt limit is not configured' ||
        result.reason === 'demo otp is not accepted')
    ) {
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

  private scoped(row: Record<string, unknown>): ScopedChallenge {
    return {
      id: String(row.id),
      jti: String(row.jti),
      attempts: Number(row.attempts),
      lockedUntilMs: row.locked_until ? new Date(String(row.locked_until)).getTime() : null,
      lockedIndefinitely: row.locked_indefinitely === true,
      consumedAtMs: row.consumed_at ? new Date(String(row.consumed_at)).getTime() : null,
      expiresAtMs: new Date(String(row.expires_at)).getTime(),
      otpHash: String(row.otp_hash),
      createdAtMs: new Date(String(row.created_at)).getTime(),
    };
  }

  private async note(
    claims: ContractSignClaims,
    action: string,
    metadata: Record<string, unknown>,
    now: number,
  ): Promise<void> {
    if (!this.events) return;
    await this.events.save(
      this.events.create({
        id: `sev_${randomBytes(8).toString('hex')}`,
        tenantId: claims.tenantId,
        requestId: claims.requestId,
        signerId: claims.signerId,
        action,
        ip: null,
        userAgent: null,
        occurredAt: new Date(now),
        channel: claims.channel,
        metadata: safeSignatureMetadata(metadata),
      }),
    );
  }

  private async noteOn(
    runner: QueryRunner,
    claims: ContractSignClaims,
    action: string,
    metadata: Record<string, unknown>,
    now: number,
  ): Promise<void> {
    const repo = runner.manager.getRepository(SignatureEventEntity);
    await repo.save(
      repo.create({
        id: `sev_${randomBytes(8).toString('hex')}`,
        tenantId: claims.tenantId,
        requestId: claims.requestId,
        signerId: claims.signerId,
        action,
        ip: null,
        userAgent: null,
        occurredAt: new Date(now),
        channel: claims.channel,
        metadata: safeSignatureMetadata(metadata),
      }),
    );
  }
}
