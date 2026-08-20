import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { AuditService } from '../audit/audit.service';
import { SmsService } from '../sms/sms.service';
import { SMS_TEMPLATES } from '../sms/sms.types';

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
  ) {}

  async sendContractOtp(
    tenantId: string,
    contractId: string,
    bookingId: string,
    buyerName: string,
  ): Promise<EsignOtpResult> {
    const booking = await this.bookings.findOne({ where: { id: bookingId, tenantId } });
    if (!booking) {
      return { sent: false, skipped: true, skipReason: 'booking_not_found' };
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

    try {
      const delivery = await this.sms.sendSms(tenantId, {
        templateId: SMS_TEMPLATES.OTP,
        phone,
        params: {
          buyer_name: buyerName,
          contract_id: contractId,
        },
        source: { type: 'ESIGN_OTP', id: contractId },
      });

      await this.audit.append({
        tenantId,
        entityType: 'contract',
        entityId: contractId,
        action: 'ESIGN_OTP_SENT',
        payload: {
          deliveryId: delivery.deliveryId,
          bookingId,
          phone,
          idempotentReplay: delivery.idempotentReplay ?? false,
        },
        actorId: null,
      });

      return {
        sent: true,
        deliveryId: delivery.deliveryId,
        sandbox: delivery.sandbox,
        idempotentReplay: delivery.idempotentReplay,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new UnprocessableEntityException({ detail: `E-sign OTP SMS failed: ${message}` });
    }
  }

  async validateContractOtp(tenantId: string, contractId: string, otp: string): Promise<boolean> {
    await this.sms.assertNotDemoOtp(tenantId, otp);
    const stored = await this.sms.getEsignOtp(tenantId, contractId);
    if (!stored) return false;
    return stored.trim() === otp.trim();
  }
}
