import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SignerChannelVerificationEntity } from '../../database/entities/signer-channel-verification.entity';
import { normalizePhone, phonesMatch } from '../crm/phone.util';
import { EmailService } from '../email/email.service';
import { EMAIL_TEMPLATES } from '../email/email.types';
import { ESIGN_DEMO_OTP } from './booking-contract.util';
import type { ContractSignChannel } from './contract-sign-token';
import {
  demoEsignOtpRejected,
  esignOtpExpiresAt,
  hashChannelDest,
  hashEsignOtp,
  maskChannelDest,
  readConfiguredPositiveInt,
  readEsignOtpPepper,
  ESIGN_OTP_MAX_ATTEMPTS_ENV,
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
  }

  async start(tenantId: string, phone: string): Promise<{ id: string; destMasked: string; sent: boolean }> {
    const pepper = this.pepper();
    const lead = await this.leadByPhone(tenantId, phone);
    if (!lead?.email?.trim()) {
      throw new UnprocessableEntityException({ detail: 'signer channel destination is not registered' });
    }
    const smsHash = hashChannelDest(lead.phone, pepper);
    const emailHash = hashChannelDest(lead.email.trim(), pepper);
    const existing = await this.rows.findOne({
      where: { tenantId, leadId: lead.id, status: 'VERIFIED' },
      order: { verifiedAt: 'DESC' },
    });
    if (existing && existing.smsDestHash === smsHash && existing.emailDestHash === emailHash) {
      return { id: existing.id, destMasked: existing.emailDestMasked, sent: false };
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
      verifiedAt: null,
    });
    return { id, destMasked: maskChannelDest(lead.email.trim()), sent: true };
  }

  async confirm(
    tenantId: string,
    id: string,
    code: string,
  ): Promise<{ verified: true; destMasked: string }> {
    const pepper = this.pepper();
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
    const maxAttempts = readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_OTP_MAX_ATTEMPTS_ENV);
    if (maxAttempts === null) {
      throw new UnprocessableEntityException({ detail: 'esign otp attempt limit is not configured' });
    }
    if (row.attemptCount >= maxAttempts) {
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
    if (!row.codeHash || hashEsignOtp(code, pepper, row.id) !== row.codeHash) {
      await this.rows.save(row);
      throw new UnprocessableEntityException({ detail: 'signer channel verification code is invalid' });
    }
    row.status = 'VERIFIED';
    row.verifiedAt = new Date();
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

  private async leadByPhone(tenantId: string, phone: string): Promise<LeadEntity | null> {
    const normalized = normalizePhone(phone);
    if (normalized.length < 9) return null;
    const variants = [normalized, `+84${normalized.slice(1)}`, `84${normalized.slice(1)}`];
    for (const candidate of variants) {
      const row = await this.leads.findOne({ where: { tenantId, phone: candidate } });
      if (row) return row;
    }
    const rows = await this.leads.find({ where: { tenantId } });
    return rows.find((row) => phonesMatch(row.phone, phone)) ?? null;
  }
}
