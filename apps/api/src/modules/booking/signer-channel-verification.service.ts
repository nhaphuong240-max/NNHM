import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomInt } from 'crypto';
import { In, Repository } from 'typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SignerChannelVerificationEntity } from '../../database/entities/signer-channel-verification.entity';
import { phonesMatch, phoneLookupVariants, toE164Vn } from '../crm/phone.util';
import { EmailService } from '../email/email.service';
import { EMAIL_TEMPLATES } from '../email/email.types';
import { ESIGN_DEMO_OTP } from './booking-contract.util';
import type { ContractSignChannel } from './contract-sign-token';
import {
  ADVISORY_LOCK_SQL,
  CLAIM_CHANNEL_VERIFY_ATTEMPT_SQL,
  channelVerifySendLockKey,
  returnedRows,
} from './esign-otp-atomic';
import {
  demoEsignOtpRejected,
  esignOtpExpiresAt,
  esignOtpMatches,
  hashChannelDest,
  hashEsignOtp,
  maskChannelDest,
  readConfiguredPositiveInt,
  readEsignOtpPepper,
  ESIGN_OTP_LOCKOUT_ENV,
  ESIGN_OTP_MAX_ATTEMPTS_ENV,
  ESIGN_OTP_RESEND_COOLDOWN_ENV,
} from './esign-otp-policy';

const CLOSED_DEST = 'signer channel destination is not registered';

@Injectable()
export class SignerChannelVerificationService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(SignerChannelVerificationEntity)
    private readonly rows: Repository<SignerChannelVerificationEntity>,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async assertVerified(
    tenantId: string,
    channel: ContractSignChannel,
    dest: string,
    leadId?: string,
  ): Promise<void> {
    const pepper = this.pepper();
    const destHash = hashChannelDest(dest, pepper);
    const verified = await this.rows.findOne({
      where:
        channel === 'EMAIL'
          ? { tenantId, status: 'VERIFIED', emailDestHash: destHash, ...(leadId ? { leadId } : {}) }
          : { tenantId, status: 'VERIFIED', smsDestHash: destHash, ...(leadId ? { leadId } : {}) },
    });
    if (!verified) {
      throw new UnprocessableEntityException({ detail: 'signer channel is not verified' });
    }
    const lead = await this.leads.findOne({ where: { id: verified.leadId, tenantId } });
    if (!lead) {
      await this.revokeRow(verified);
      throw new UnprocessableEntityException({ detail: 'signer channel is not verified' });
    }
    const smsHash = hashChannelDest(lead.phone, pepper);
    const emailHash = hashChannelDest(lead.email?.trim() ?? '', pepper);
    if (verified.smsDestHash !== smsHash || verified.emailDestHash !== emailHash) {
      await this.revokeRow(verified);
      throw new UnprocessableEntityException({ detail: 'signer channel is not verified' });
    }
  }

  async verifiedSmsPhone(tenantId: string, destHash: string): Promise<string | null> {
    if (!destHash) return null;
    const verified = await this.rows.findOne({ where: { tenantId, status: 'VERIFIED', smsDestHash: destHash } });
    if (!verified) return null;
    const lead = await this.leads.findOne({ where: { id: verified.leadId, tenantId } });
    const phone = lead?.phone?.trim() ?? '';
    if (!phone) return null;
    if (hashChannelDest(phone, this.pepper()) !== destHash) return null;
    return phone;
  }

  async start(
    tenantId: string,
    phone: string,
    actor?: { actorId: string; role: string; seekerPhone?: string },
  ): Promise<{ id: string; destMasked: string; sent: boolean }> {
    const pepper = this.pepper();
    const cooldown = readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_OTP_RESEND_COOLDOWN_ENV);
    if (cooldown === null) {
      throw new UnprocessableEntityException({ detail: 'esign otp cooldown is not configured' });
    }
    const e164 = toE164Vn(phone);
    if (!e164) {
      throw new UnprocessableEntityException({ detail: CLOSED_DEST });
    }
    const lead = await this.uniqueLeadByPhone(tenantId, phone);
    if (!lead || !lead.email?.trim()) {
      throw new UnprocessableEntityException({ detail: CLOSED_DEST });
    }
    if (actor?.role === 'SEEKER') {
      const seekerPhone = actor.seekerPhone?.trim() ?? '';
      if (!seekerPhone || !phonesMatch(seekerPhone, lead.phone)) {
        throw new UnprocessableEntityException({ detail: CLOSED_DEST });
      }
    }
    const destEmail = lead.email?.trim() ?? '';
    const smsHash = hashChannelDest(lead.phone, pepper);
    const emailHash = hashChannelDest(destEmail, pepper);
    return this.rows.manager.transaction(async (manager) => {
      await manager.query(ADVISORY_LOCK_SQL, [channelVerifySendLockKey(tenantId, lead.id)]);
      const repo = manager.getRepository(SignerChannelVerificationEntity);
      const latest = await repo.find({
        where: { tenantId, leadId: lead.id },
        order: { createdAt: 'DESC' },
      });
      for (const row of latest.filter((item) => item.status === 'VERIFIED')) {
        if (row.smsDestHash === smsHash && row.emailDestHash === emailHash) {
          return { id: row.id, destMasked: row.emailDestMasked, sent: false };
        }
        await this.revokeRow(row, repo);
      }
      const pending = latest.find((row) => row.status === 'PENDING' && row.expiresAt.getTime() > Date.now());
      const lastSent = pending?.lastSentAt ?? pending?.createdAt;
      if (pending && lastSent && Date.now() < lastSent.getTime() + cooldown * 1000) {
        throw new UnprocessableEntityException({ detail: CLOSED_DEST });
      }
      if (pending) {
        return this.dispatchCode(repo, pending, destEmail, pepper);
      }
      const id = `scv_${randomBytes(8).toString('hex')}`;
      const created = repo.create({
        id,
        tenantId,
        leadId: lead.id,
        smsDestHash: smsHash,
        emailDestHash: emailHash,
        emailDestMasked: maskChannelDest(destEmail),
        codeHash: null,
        status: 'PENDING',
        expiresAt: esignOtpExpiresAt(Date.now()),
        lastSentAt: null,
        sendCount: 0,
        attemptCount: 0,
        lockedUntil: null,
        lockedIndefinitely: false,
        verifiedAt: null,
        verifiedBy: actor?.actorId ?? null,
        method: 'EMAIL_CODE',
        createdAt: new Date(),
      });
      const saved = await repo.save(created);
      return this.dispatchCode(repo, saved, destEmail, pepper);
    });
  }

  async confirm(tenantId: string, id: string, code: string): Promise<{ verified: true; destMasked: string }> {
    const pepper = this.pepper();
    const maxAttempts = readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_OTP_MAX_ATTEMPTS_ENV);
    const lockoutSeconds = readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_OTP_LOCKOUT_ENV);
    if (maxAttempts === null) {
      throw new UnprocessableEntityException({ detail: 'esign otp attempt limit is not configured' });
    }
    if (lockoutSeconds === null) {
      throw new UnprocessableEntityException({ detail: 'esign otp lockout is not configured' });
    }
    const existing = await this.rows.findOne({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException({ detail: 'not found' });
    }
    if (existing.status === 'VERIFIED') {
      return { verified: true, destMasked: existing.emailDestMasked };
    }
    let emailSandbox = false;
    try {
      emailSandbox = this.email.isSandbox();
    } catch {
      emailSandbox = false;
    }
    if (
      demoEsignOtpRejected({
        otp: code,
        nodeEnv: this.config.get<string>('NODE_ENV'),
        smsSandbox: false,
        emailSandbox,
        channel: 'EMAIL',
      })
    ) {
      throw new UnprocessableEntityException({ detail: 'demo otp is not allowed' });
    }
    const lockedUntil = new Date(Date.now() + lockoutSeconds * 1000);
    const claimed = returnedRows(
      await this.rows.manager.query(CLAIM_CHANNEL_VERIFY_ATTEMPT_SQL, [
        id,
        tenantId,
        maxAttempts,
        lockedUntil,
      ]),
    )[0] as
      | {
          id: string;
          attempt_count: number;
          code_hash: string | null;
          email_dest_masked: string;
          lead_id: string;
          locked_until: Date | string | null;
        }
      | undefined;
    if (!claimed) {
      throw new UnprocessableEntityException({
        detail:
          existing.status !== 'PENDING' || existing.expiresAt.getTime() <= Date.now()
            ? 'signer channel verification is not open'
            : 'signer channel verification is locked',
      });
    }
    if (!claimed.code_hash || !esignOtpMatches(code, claimed.code_hash, pepper, claimed.id)) {
      throw new UnprocessableEntityException({
        detail:
          claimed.attempt_count >= maxAttempts || claimed.locked_until
            ? 'signer channel verification is locked'
            : 'signer channel verification code is invalid',
      });
    }
    existing.status = 'VERIFIED';
    existing.verifiedAt = new Date();
    existing.verifiedBy = existing.verifiedBy ?? existing.leadId;
    existing.method = 'EMAIL_CODE';
    existing.codeHash = null;
    existing.attemptCount = claimed.attempt_count;
    await this.rows.save(existing);
    return { verified: true, destMasked: claimed.email_dest_masked };
  }

  private async dispatchCode(
    repo: Repository<SignerChannelVerificationEntity>,
    row: SignerChannelVerificationEntity,
    email: string,
    pepper: string,
  ): Promise<{ id: string; destMasked: string; sent: boolean }> {
    this.email.assertReady(EMAIL_TEMPLATES.CHANNEL_VERIFY);
    if (this.config.get<string>('NODE_ENV') === 'production' && this.email.isSandbox()) {
      throw new UnprocessableEntityException({ detail: 'email sandbox is not allowed in production' });
    }
    const sandbox = this.email.isSandbox();
    const code = sandbox ? ESIGN_DEMO_OTP : String(randomInt(100000, 999999));
    const nextSend = Number(row.sendCount ?? 0) + 1;
    const sourceId = `${row.id}:${randomBytes(8).toString('hex')}`;
    const sent = await this.email.send(row.tenantId, {
      to: email,
      templateId: EMAIL_TEMPLATES.CHANNEL_VERIFY,
      persistOtp: false,
      params: { otp: code },
      source: { type: 'CHANNEL_VERIFY', id: sourceId },
    });
    if (sent.idempotentReplay) {
      return { id: row.id, destMasked: row.emailDestMasked, sent: false };
    }
    if (sent.status !== 'SENT' && sent.status !== 'QUEUED') {
      throw new UnprocessableEntityException({ detail: 'signer channel verification was not sent' });
    }
    row.codeHash = hashEsignOtp(code, pepper, row.id);
    row.expiresAt = esignOtpExpiresAt(Date.now());
    row.lastSentAt = new Date();
    row.sendCount = nextSend;
    await repo.save(row);
    return { id: row.id, destMasked: row.emailDestMasked, sent: sent.status === 'SENT' };
  }

  private async revokeRow(
    row: SignerChannelVerificationEntity,
    repo: Repository<SignerChannelVerificationEntity> = this.rows,
  ): Promise<void> {
    row.status = 'REVOKED';
    await repo.save(row);
  }

  private pepper(): string {
    const pepper = readEsignOtpPepper((key) => this.config.get<string>(key));
    if (!pepper) {
      throw new UnprocessableEntityException({ detail: 'esign otp pepper is not configured' });
    }
    return pepper;
  }

  private async uniqueLeadByPhone(tenantId: string, phone: string): Promise<LeadEntity | null> {
    const variants = phoneLookupVariants(phone);
    if (!variants.length) return null;
    const matches = await this.leads.find({ where: { tenantId, phone: In(variants) } });
    if (matches.length > 1) {
      throw new UnprocessableEntityException({ detail: CLOSED_DEST });
    }
    return matches[0] ?? null;
  }
}
