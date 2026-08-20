import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { formatVndAmount } from './zalo-format.util';
import { ZaloLeadService } from './zalo-lead.service';
import { ZALO_ZNS_TEMPLATES } from './zalo.types';

export interface PaymentSuccessZnsInput {
  tenantId: string;
  paymentIntentId: string;
  bookingId: string;
  amount: number;
  transactionId: string;
  webhookEventId: string;
}

export interface PaymentSuccessZnsResult {
  sent: boolean;
  skipped?: boolean;
  skipReason?: string;
  deliveryId?: string;
  status?: string;
  providerRef?: string | null;
  idempotentReplay?: boolean;
  sandbox?: boolean;
}

/** AC-US-NW-02 — auto ZNS after payment.success webhook */
@Injectable()
export class ZaloPaymentNotifyService {
  private readonly logger = new Logger(ZaloPaymentNotifyService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    private readonly zalo: ZaloLeadService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  isEnabled() {
    return this.config.get<string>('ZALO_PAYMENT_ZNS_ENABLED', 'true') !== 'false';
  }

  async notifyPaymentSuccess(input: PaymentSuccessZnsInput): Promise<PaymentSuccessZnsResult> {
    if (!this.isEnabled()) {
      return { sent: false, skipped: true, skipReason: 'ZALO_PAYMENT_ZNS_ENABLED=false' };
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

    const templateParams = {
      customer_name: customerName,
      unit_code: unit?.code ?? booking.unitId,
      amount: formatVndAmount(input.amount),
      booking_id: booking.id,
      transaction_id: input.transactionId,
    };

    try {
      const delivery = await this.zalo.sendZns(input.tenantId, {
        templateId: ZALO_ZNS_TEMPLATES.BOOKING_CONFIRM,
        phone,
        params: templateParams,
        source: { type: 'PAYMENT_SUCCESS', id: input.paymentIntentId },
      });

      await this.audit.append({
        tenantId: input.tenantId,
        entityType: 'payment_webhook',
        entityId: input.webhookEventId,
        action: 'PAYMENT_ZNS_SENT',
        payload: {
          paymentIntentId: input.paymentIntentId,
          bookingId: input.bookingId,
          deliveryId: delivery.deliveryId,
          status: delivery.status,
          providerRef: delivery.providerRef,
          phone,
          idempotentReplay: delivery.idempotentReplay ?? false,
        },
        actorId: null,
      });

      this.logger.log(
        `AC-US-NW-02 payment ZNS ${delivery.deliveryId} for ${input.paymentIntentId}`,
      );

      return {
        sent: true,
        deliveryId: delivery.deliveryId,
        status: delivery.status,
        providerRef: delivery.providerRef,
        idempotentReplay: delivery.idempotentReplay,
        sandbox: delivery.sandbox,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AC-US-NW-02 ZNS failed for ${input.paymentIntentId}: ${message}`);

      await this.audit.append({
        tenantId: input.tenantId,
        entityType: 'payment_webhook',
        entityId: input.webhookEventId,
        action: 'PAYMENT_ZNS_FAILED',
        payload: {
          paymentIntentId: input.paymentIntentId,
          bookingId: input.bookingId,
          error: message,
        },
        actorId: null,
      });

      return { sent: false, skipped: true, skipReason: message };
    }
  }
}
