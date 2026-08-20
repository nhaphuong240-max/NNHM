import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { SmsService } from './sms.service';
import { SMS_TEMPLATES } from './sms.types';

export interface PaymentOtpInput {
  tenantId: string;
  paymentIntentId: string;
  bookingId: string;
  amount: number;
}

export interface PaymentOtpResult {
  sent: boolean;
  skipped?: boolean;
  skipReason?: string;
  deliveryId?: string;
  otp?: string;
  idempotentReplay?: boolean;
}

export interface PaymentSuccessSmsInput {
  tenantId: string;
  paymentIntentId: string;
  bookingId: string;
  amount: number;
  transactionId: string;
  webhookEventId: string;
}

@Injectable()
export class SmsPaymentNotifyService {
  private readonly logger = new Logger(SmsPaymentNotifyService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    private readonly sms: SmsService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  isOtpEnabled() {
    return this.config.get<string>('SMS_PAYMENT_OTP_ENABLED', 'true') !== 'false';
  }

  isSuccessNotifyEnabled() {
    return this.config.get<string>('SMS_PAYMENT_SUCCESS_ENABLED', 'true') !== 'false';
  }

  async sendPaymentOtp(input: PaymentOtpInput): Promise<PaymentOtpResult> {
    if (!this.isOtpEnabled()) {
      return { sent: false, skipped: true, skipReason: 'SMS_PAYMENT_OTP_ENABLED=false' };
    }

    const booking = await this.bookings.findOne({
      where: { id: input.bookingId, tenantId: input.tenantId },
    });
    if (!booking) {
      return { sent: false, skipped: true, skipReason: 'booking_not_found' };
    }

    let phone: string | undefined;
    if (booking.leadId) {
      const lead = await this.leads.findOne({
        where: { id: booking.leadId, tenantId: input.tenantId },
      });
      phone = lead?.phone;
    }

    if (!phone) {
      return { sent: false, skipped: true, skipReason: 'buyer_phone_missing' };
    }

    try {
      const delivery = await this.sms.sendSms(input.tenantId, {
        templateId: SMS_TEMPLATES.OTP,
        phone,
        params: {
          amount: input.amount,
          booking_id: input.bookingId,
        },
        source: { type: 'PAYMENT_OTP', id: input.paymentIntentId },
      });

      await this.audit.append({
        tenantId: input.tenantId,
        entityType: 'payment_intent',
        entityId: input.paymentIntentId,
        action: 'PAYMENT_SMS_OTP_SENT',
        payload: {
          deliveryId: delivery.deliveryId,
          bookingId: input.bookingId,
          phone,
          idempotentReplay: delivery.idempotentReplay ?? false,
        },
        actorId: null,
      });

      this.logger.log(`UC-NW-03 payment OTP SMS ${delivery.deliveryId} for ${input.paymentIntentId}`);

      return {
        sent: true,
        deliveryId: delivery.deliveryId,
        otp: delivery.otp,
        idempotentReplay: delivery.idempotentReplay,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`UC-NW-03 OTP SMS failed for ${input.paymentIntentId}: ${message}`);
      return { sent: false, skipped: true, skipReason: message };
    }
  }

  async notifyPaymentSuccess(input: PaymentSuccessSmsInput) {
    if (!this.isSuccessNotifyEnabled()) {
      return { sent: false, skipped: true, skipReason: 'SMS_PAYMENT_SUCCESS_ENABLED=false' };
    }

    const booking = await this.bookings.findOne({
      where: { id: input.bookingId, tenantId: input.tenantId },
    });
    if (!booking) {
      return { sent: false, skipped: true, skipReason: 'booking_not_found' };
    }

    let phone: string | undefined;
    let customerName = 'Khách hàng';
    if (booking.leadId) {
      const lead = await this.leads.findOne({
        where: { id: booking.leadId, tenantId: input.tenantId },
      });
      if (lead?.phone) {
        phone = lead.phone;
        customerName = lead.fullName;
      }
    }

    if (!phone) {
      return { sent: false, skipped: true, skipReason: 'buyer_phone_missing' };
    }

    const unit = await this.units.findOne({
      where: { id: booking.unitId, tenantId: input.tenantId },
    });

    try {
      const delivery = await this.sms.sendSms(input.tenantId, {
        templateId: SMS_TEMPLATES.BOOKING_CONFIRM,
        phone,
        params: {
          customer_name: customerName,
          unit_code: unit?.code ?? booking.unitId,
          amount: input.amount,
          booking_id: booking.id,
          transaction_id: input.transactionId,
        },
        source: { type: 'PAYMENT_SUCCESS', id: input.paymentIntentId },
      });

      await this.audit.append({
        tenantId: input.tenantId,
        entityType: 'payment_webhook',
        entityId: input.webhookEventId,
        action: 'PAYMENT_SMS_SENT',
        payload: {
          paymentIntentId: input.paymentIntentId,
          deliveryId: delivery.deliveryId,
          status: delivery.status,
        },
        actorId: null,
      });

      return {
        sent: true,
        deliveryId: delivery.deliveryId,
        status: delivery.status,
        idempotentReplay: delivery.idempotentReplay,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { sent: false, skipped: true, skipReason: message };
    }
  }
}
