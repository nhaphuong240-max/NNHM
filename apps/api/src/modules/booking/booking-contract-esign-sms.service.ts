import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SignatureSignerEntity } from '../../database/entities/signature-signer.entity';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { EMAIL_TEMPLATES } from '../email/email.types';
import { SmsService } from '../sms/sms.service';
import { SMS_TEMPLATES } from '../sms/sms.types';
import type { ContractSignClaims } from './contract-sign-token';
import { EsignOtpChallengeService } from './esign-otp-challenge.service';
import {
  decideEsignResend,
  esignOtpSentAudit,
  hashChannelDest,
  readConfiguredPositiveInt,
  readEsignOtpPepper,
  ESIGN_OTP_RESEND_COOLDOWN_ENV,
} from './esign-otp-policy';
import { RailResolverService } from '../tenant-config/rail-resolver.service';
import { SignerChannelVerificationService } from './signer-channel-verification.service';

export interface EsignOtpResult {
  sent: boolean;
  skipped?: boolean;
  skipReason?: string;
  deliveryId?: string;
  sandbox?: boolean;
  idempotentReplay?: boolean;
}

@Injectable()
export class BookingContractEsignSmsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    private readonly sms: SmsService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
    private readonly challenges: EsignOtpChallengeService,
    private readonly rails: RailResolverService,
    @InjectRepository(SignatureSignerEntity)
    private readonly signers?: Repository<SignatureSignerEntity>,
    private readonly channels?: SignerChannelVerificationService,
  ) {}

  async sendContractOtp(
    tenantId: string,
    contractId: string,
    bookingId: string,
    buyerName: string,
    access?: ContractSignClaims,
  ): Promise<EsignOtpResult> {
    if (!access?.jti || !access.signerId || !access.requestId) {
      throw new UnprocessableEntityException({ detail: 'sign access ticket is required' });
    }
    this.challenges.assertReadyToIssue();
    const latest = await this.challenges.findLatest(tenantId, access.jti);
    const decision = decideEsignResend({
      latestCreatedAtMs: latest ? latest.createdAt.getTime() : null,
      latestExpiresAtMs: latest ? latest.expiresAt.getTime() : null,
      latestConsumed: Boolean(latest?.consumedAt),
      now: Date.now(),
      cooldownSeconds: readConfiguredPositiveInt(
        (key) => this.challenges.readConfig(key),
        ESIGN_OTP_RESEND_COOLDOWN_ENV,
      ),
    });
    const resolved = await this.resolveDest(tenantId, bookingId, access.channel);
    if (!resolved.ok) return resolved.result;
    if (!this.channels) {
      throw new UnprocessableEntityException({ detail: 'signer channel is not verified' });
    }
    await this.channels.assertVerified(tenantId, access.channel, resolved.dest);
    await this.assertDestMatchesTicket(tenantId, access, resolved.dest);
    if (decision === 'replay') {
      if (!latest) {
        throw new UnprocessableEntityException({ detail: 'e-sign otp was not issued' });
      }
      return this.sent(tenantId, contractId, bookingId, resolved.dest, latest.id, undefined, true);
    }
    if (decision === 'unconfigured') {
      throw new UnprocessableEntityException({ detail: 'esign otp resend cooldown is not configured' });
    }
    if (decision === 'cooling') {
      throw new UnprocessableEntityException({ detail: 'esign otp resend is cooling down' });
    }
    await this.challenges.assertSendBudget(access);
    if (access.channel === 'ZALO') {
      throw new UnprocessableEntityException({ detail: 'esign zalo is disabled' });
    }

    try {
      const delivery =
        access.channel === 'EMAIL'
          ? await this.email.send(tenantId, {
              to: resolved.dest,
              templateId: EMAIL_TEMPLATES.OTP,
              persistOtp: false,
              params: { buyer_name: buyerName, contract_id: contractId },
              source: { type: 'ESIGN_OTP', id: `${contractId}:${access.jti}:${latest?.id ?? 'first'}` },
            })
          : await this.sms.sendSms(tenantId, {
              templateId: SMS_TEMPLATES.OTP,
              phone: resolved.dest,
              persistOtp: false,
              maskStoredDest: true,
              params: {
                buyer_name: buyerName,
                contract_id: contractId,
              },
              source: { type: 'ESIGN_OTP', id: `${contractId}:${access.jti}:${latest?.id ?? 'first'}` },
            });
      if (!delivery.otp) {
        throw new UnprocessableEntityException({ detail: 'e-sign otp was not issued' });
      }
      const issued = await this.challenges.issue({ claims: access, otp: delivery.otp });
      return this.sent(
        tenantId,
        contractId,
        bookingId,
        resolved.dest,
        delivery.deliveryId,
        delivery.sandbox,
        issued.replay,
      );
    } catch (err) {
      if (err instanceof UnprocessableEntityException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new UnprocessableEntityException({ detail: `E-sign OTP SMS failed: ${message}` });
    }
  }

  async validateContractOtp(
    tenantId: string,
    contractId: string,
    otp: string,
    jti?: string,
  ): Promise<boolean> {
    void contractId;
    if (!jti?.trim()) {
      throw new UnprocessableEntityException({ detail: 'sign access ticket is required' });
    }
    const rails = await this.rails.resolve(tenantId);
    let emailSandbox = false;
    try {
      emailSandbox = this.email.isSandbox();
    } catch {
      emailSandbox = false;
    }
    return this.challenges.verify({
      tenantId,
      jti,
      otp,
      smsSandbox: rails.smsSandbox !== false,
      emailSandbox,
    });
  }

  private async assertDestMatchesTicket(
    tenantId: string,
    access: ContractSignClaims,
    dest: string,
  ): Promise<void> {
    if (!this.signers) return;
    const signer = await this.signers.findOne({ where: { id: access.signerId, tenantId } });
    if (!signer?.channelDestHash) return;
    const pepper = readEsignOtpPepper((key) => this.challenges.readConfig(key));
    if (!pepper) {
      throw new UnprocessableEntityException({ detail: 'esign otp pepper is not configured' });
    }
    if (hashChannelDest(dest, pepper) !== signer.channelDestHash) {
      throw new UnprocessableEntityException({ detail: 'signer channel destination does not match the ticket' });
    }
  }

  private async resolveDest(
    tenantId: string,
    bookingId: string,
    channel: ContractSignClaims['channel'],
  ): Promise<{ ok: true; dest: string } | { ok: false; result: EsignOtpResult }> {
    const booking = await this.bookings.findOne({ where: { id: bookingId, tenantId } });
    if (!booking) {
      return { ok: false, result: { sent: false, skipped: true, skipReason: 'booking_not_found' } };
    }
    const lead = booking.leadId
      ? await this.leads.findOne({ where: { id: booking.leadId, tenantId } })
      : null;
    if (channel === 'EMAIL') {
      if (!lead?.email?.trim()) {
        throw new UnprocessableEntityException({ detail: 'signer email is not registered' });
      }
      return { ok: true, dest: lead.email.trim() };
    }
    if (channel === 'ZALO') {
      throw new UnprocessableEntityException({ detail: 'esign zalo is disabled' });
    }
    const phone = lead?.phone;
    if (!phone) {
      throw new UnprocessableEntityException({
        detail: 'signer phone is not registered',
      });
    }
    return { ok: true, dest: phone };
  }

  private async sent(
    tenantId: string,
    contractId: string,
    bookingId: string,
    phone: string,
    deliveryId: string,
    sandbox: boolean | undefined,
    idempotentReplay: boolean,
  ): Promise<EsignOtpResult> {
    await this.audit.append({
      tenantId,
      entityType: 'contract',
      entityId: contractId,
      action: 'ESIGN_OTP_SENT',
      payload: esignOtpSentAudit({
        deliveryId,
        bookingId,
        phone,
        idempotentReplay,
      }),
      actorId: null,
    });
    return {
      sent: true,
      deliveryId,
      sandbox,
      idempotentReplay,
    };
  }
}
