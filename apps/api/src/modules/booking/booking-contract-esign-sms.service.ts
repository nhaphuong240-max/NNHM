import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { AuditService } from '../audit/audit.service';
import { SmsService } from '../sms/sms.service';
import { SMS_TEMPLATES } from '../sms/sms.types';
import type { ContractSignClaims } from './contract-sign-token';
import { EsignOtpChallengeService } from './esign-otp-challenge.service';
import {
  decideEsignResend,
  esignOtpSentAudit,
  readConfiguredPositiveInt,
  ESIGN_OTP_RESEND_COOLDOWN_ENV,
} from './esign-otp-policy';
import { RailResolverService } from '../tenant-config/rail-resolver.service';

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
    private readonly audit: AuditService,
    private readonly challenges: EsignOtpChallengeService,
    private readonly rails: RailResolverService,
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
    const resolved = await this.resolvePhone(tenantId, bookingId);
    if (!resolved.ok) return resolved.result;
    if (decision === 'replay') {
      if (!latest) {
        throw new UnprocessableEntityException({ detail: 'e-sign otp was not issued' });
      }
      return this.sent(tenantId, contractId, bookingId, resolved.phone, latest.id, undefined, true);
    }
    if (decision === 'unconfigured') {
      throw new UnprocessableEntityException({ detail: 'esign otp resend cooldown is not configured' });
    }
    if (decision === 'cooling') {
      throw new UnprocessableEntityException({ detail: 'esign otp resend is cooling down' });
    }
    await this.challenges.assertSendBudget(access);

    try {
      const delivery = await this.sms.sendSms(tenantId, {
        templateId: SMS_TEMPLATES.OTP,
        phone: resolved.phone,
        persistOtp: false,
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
        resolved.phone,
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
    return this.challenges.verify({
      tenantId,
      jti,
      otp,
      smsSandbox: rails.smsSandbox !== false,
    });
  }

  private async resolvePhone(
    tenantId: string,
    bookingId: string,
  ): Promise<{ ok: true; phone: string } | { ok: false; result: EsignOtpResult }> {
    const booking = await this.bookings.findOne({ where: { id: bookingId, tenantId } });
    if (!booking) {
      return { ok: false, result: { sent: false, skipped: true, skipReason: 'booking_not_found' } };
    }
    let phone: string | undefined;
    if (booking.leadId) {
      const lead = await this.leads.findOne({ where: { id: booking.leadId, tenantId } });
      phone = lead?.phone;
    }
    if (!phone) {
      throw new UnprocessableEntityException({
        detail: 'Buyer phone required for e-sign OTP (UC-NW-03)',
      });
    }
    return { ok: true, phone };
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
