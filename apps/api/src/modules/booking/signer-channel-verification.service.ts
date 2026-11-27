import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SignerChannelVerificationEntity } from '../../database/entities/signer-channel-verification.entity';
import { phonesMatch, toE164Vn } from '../crm/phone.util';
import { EmailService } from '../email/email.service';
import { EMAIL_TEMPLATES } from '../email/email.types';
import { ESIGN_DEMO_OTP } from './booking-contract.util';
import type { ContractSignChannel } from './contract-sign-token';
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

  async assertVerified(tenantId: string, channel: ContractSignChannel, dest: string): Promise<void> {
    const pepper = this.pepper();
    const destHash = hashChannelDest(dest, pepper);
    const verified = await this.rows.findOne({
      where:
        channel === 'EMAIL'
          ? { tenantId, status: 'VERIFIED', emailDestHash: destHash }
          : { tenantId, status: 'VERIFIED', smsDestHash: destHash },
    });
    if (!verified) {
      throw new UnprocessableEntityException({ detail: 'signer channel is not verified' });
    }
    const lead = await this.leads.findOne({ where: { id: verified.leadId, tenantId } });
    if (!lead) {
      verified.status = 'REVOKED';
      await this.rows.save(verified);
      throw new UnprocessableEntityException({ detail: 'signer channel is not verified' });
    }
    const smsHash = hashChannelDest(lead.phone, pepper);
    const emailHash = hashChannelDest(lead.email?.trim() ?? '', pepper);
    if (verified.smsDestHash !== smsHash || verified.emailDestHash !== emailHash) {
      verified.status = 'REVOKED';
      await this.rows.save(verified);
      throw new UnprocessableEntityException({ detail: 'signer channel is not verified' });
    }
  }

  async start(tenantId: string, phone: string): Promise<{ id: string; destMasked: string; sent: boolean }> {
    const pepper = this.pepper();
    const cooldown = readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_OTP_RESEND_COOLDOWN_ENV);
    if (cooldown === null) {
      throw new UnprocessableEntityException({ detail: 'esign otp cooldown is not configured' });
    }
    const e164 = toE164Vn(phone);
    if (!e164) {
      throw new UnprocessableEntityException({ detail: 'signer channel destination is not registered' });
    }
    const lead = await this.uniqueLeadByPhone(tenantId, phone);
    if (!lead) {
      throw new UnprocessableEntityException({ detail: 'signer channel destination is not registered' });
    }
    if (!lead.email?.trim()) {
      throw new UnprocessableEntityException({ detail: 'signer channel destination has no email' });
    }
    const smsHash = hashChannelDest(lead.phone, pepper);
    const emailHash = hashChannelDest(lead.email.trim(), pepper);
    const latest = await this.rows.find({
      where: { tenantId, leadId: lead.id },
      order: { createdAt: 'DESC' },
    });
    for (const row of latest.filter((item) => item.status === 'VERIFIED')) {
      if (row.smsDestHash === smsHash && row.emailDestHash === emailHash) {
        return { id: row.id, destMasked: row.emailDestMasked, sent: false };
      }
      row.status = 'REVOKED';
      await this.rows.save(row);
    }
    const pending = latest.find((row) => row.status === 'PENDING' && row.createdAt);
    if (pending && Date.now() < pending.createdAt.getTime() + cooldown * 1000) {
      throw new UnprocessableEntityException({ detail: 'esign otp cooldown is active' });
    }
    this.email.assertReady(EMAIL_TEMPLATES.CHANNEL_VERIFY);
    if (this.config.get<string>('NODE_ENV') === 'production' && this.email.isSandbox()) {
      throw new UnprocessableEntityException({ detail: 'email sandbox is not allowed in production' });
    }
    const id = `scv_${randomBytes(8).toString('hex')}`;
    const sandbox = this.email.isSandbox();
    const code = sandbox ? ESIGN_DEMO_OTP : String(randomInt(100000, 999999));
    const sent = await this.email.send(tenantId, {
      to: lead.email.trim(),
      templateId: EMAIL_TEMPLATES.CHANNEL_VERIFY,
      persistOtp: false,
      params: { otp: code },
      source: { type: 'CHANNEL_VERIFY', id },
    });
    if (sent.status !== 'SENT' && sent.status !== 'QUEUED') {
      throw new UnprocessableEntityException({ detail: 'signer channel verification was not sent' });
    }
    await this.rows.save({
      id,
      tenantId,
      leadId: lead.id,
      smsDestHash: smsHash,
      emailDestHash: emailHash,
      emailDestMasked: maskChannelDest(lead.email.trim()),
      codeHash: hashEsignOtp(code, pepper, id),
      status: 'PENDING',
      expiresAt: esignOtpExpiresAt(Date.now()),
      attemptCount: 0,
      lockedUntil: null,
      lockedIndefinitely: false,
      verifiedAt: null,
      verifiedBy: null,
      method: 'EMAIL_CODE',
      createdAt: new Date(),
    });
    return { id, destMasked: maskChannelDest(lead.email.trim()), sent: true };
  }

  async confirm(
    tenantId: string,
    id: string,
    code: string,
  ): Promise<{ verified: true; destMasked: string }> {
    const pepper = this.pepper();
    const maxAttempts = readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_OTP_MAX_ATTEMPTS_ENV);
    const lockoutSeconds = readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_OTP_LOCKOUT_ENV);
    if (maxAttempts === null) {
      throw new UnprocessableEntityException({ detail: 'esign otp attempt limit is not configured' });
    }
    if (lockoutSeconds === null) {
      throw new UnprocessableEntityException({ detail: 'esign otp lockout is not configured' });
    }
    const row = await this.rows.findOne({ where: { id, tenantId } });
    if (!row) {
      throw new NotFoundException({ detail: 'not found' });
    }
    if (row.status === 'VERIFIED') {
      return { verified: true, destMasked: row.emailDestMasked };
    }
    if (row.status !== 'PENDING' || row.expiresAt.getTime() <= Date.now()) {
      throw new UnprocessableEntityException({ detail: 'signer channel verification is not open' });
    }
    const now = Date.now();
    if (row.lockedIndefinitely || (row.lockedUntil && row.lockedUntil.getTime() > now)) {
      throw new UnprocessableEntityException({ detail: 'signer channel verification is locked' });
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
    row.attemptCount += 1;
    if (!row.codeHash || !esignOtpMatches(code, row.codeHash, pepper, row.id)) {
      const exhausted = row.attemptCount >= maxAttempts;
      if (exhausted) {
        row.lockedUntil = new Date(now + lockoutSeconds * 1000);
      }
      await this.rows.save(row);
      throw new UnprocessableEntityException({
        detail: exhausted ? 'signer channel verification is locked' : 'signer channel verification code is invalid',
      });
    }
    row.status = 'VERIFIED';
    row.verifiedAt = new Date();
    row.verifiedBy = row.leadId;
    row.method = 'EMAIL_CODE';
    row.codeHash = null;
    await this.rows.save(row);
    return { verified: true, destMasked: row.emailDestMasked };
  }

  private pepper(): string {
    const pepper = readEsignOtpPepper((key) => this.config.get<string>(key));
    if (!pepper) {
      throw new UnprocessableEntityException({ detail: 'esign otp pepper is not configured' });
    }
    return pepper;
  }

  private async uniqueLeadByPhone(tenantId: string, phone: string): Promise<LeadEntity | null> {
    const rows = await this.leads.find({ where: { tenantId } });
    const matches = rows.filter((row) => phonesMatch(row.phone, phone));
    if (matches.length > 1) {
      throw new UnprocessableEntityException({ detail: 'signer channel destination is ambiguous' });
    }
    return matches[0] ?? null;
  }
}
