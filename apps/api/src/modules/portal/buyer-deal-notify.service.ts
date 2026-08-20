import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { formatVndAmount } from '../zalo/zalo-format.util';
import { ZaloLeadService } from '../zalo/zalo-lead.service';
import { ZALO_ZNS_TEMPLATES } from '../zalo/zalo.types';

export type BuyerDealNotifyInput = {
  tenantId: string;
  bookingId: string;
  event: 'BOOKING_RESERVED' | 'PAYMENT_SUCCESS' | 'CONTRACT_SIGNED';
};

export type BuyerDealNotifyResult = {
  sent: boolean;
  channel: 'ZNS' | 'NONE';
  skipped?: boolean;
  skipReason?: string;
  deliveryId?: string;
};

/** UC-UX-02 — buyer deal ZNS stub (pattern ZaloPaymentNotifyService) */
@Injectable()
export class BuyerDealNotifyService {
  private readonly logger = new Logger(BuyerDealNotifyService.name);

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
    return this.config.get<string>('ZALO_DEAL_ZNS_ENABLED', 'true') !== 'false';
  }

  async notifyDealUpdate(input: BuyerDealNotifyInput): Promise<BuyerDealNotifyResult> {
    if (!this.isEnabled()) {
      return { sent: false, channel: 'NONE', skipped: true, skipReason: 'ZALO_DEAL_ZNS_ENABLED=false' };
    }

    const booking = await this.bookings.findOne({
      where: { id: input.bookingId, tenantId: input.tenantId },
    });
    if (!booking) {
      return { sent: false, channel: 'NONE', skipped: true, skipReason: 'booking_not_found' };
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
      return { sent: false, channel: 'NONE', skipped: true, skipReason: 'buyer_phone_missing' };
    }

    const unit = await this.units.findOne({
      where: { id: booking.unitId, tenantId: input.tenantId },
    });

    const eventLabel =
      input.event === 'CONTRACT_SIGNED'
        ? 'Hợp đồng đã ký'
        : input.event === 'PAYMENT_SUCCESS'
          ? 'Thanh toán cọc thành công'
          : 'Giữ chỗ căn thành công';

    try {
      const delivery = await this.zalo.sendZns(input.tenantId, {
        templateId: ZALO_ZNS_TEMPLATES.BOOKING_CONFIRM,
        phone,
        params: {
          customer_name: customerName,
          unit_code: unit?.code ?? booking.unitId,
          amount: booking.depositAmount ? formatVndAmount(Number(booking.depositAmount)) : '—',
          booking_id: booking.id,
          transaction_id: input.event,
        },
        source: { type: 'MANUAL', id: `${input.bookingId}:${input.event}` },
      });

      await this.audit.append({
        tenantId: input.tenantId,
        entityType: 'booking',
        entityId: input.bookingId,
        action: 'BUYER_DEAL_ZNS_SENT',
        payload: {
          event: input.event,
          eventLabel,
          deliveryId: delivery.deliveryId,
          phone,
          status: delivery.status,
        },
        actorId: null,
      });

      this.logger.log(`UC-UX-02 deal ZNS ${delivery.deliveryId} for ${input.bookingId}`);

      return {
        sent: true,
        channel: 'ZNS',
        deliveryId: delivery.deliveryId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { sent: false, channel: 'ZNS', skipped: true, skipReason: message };
    }
  }
}
