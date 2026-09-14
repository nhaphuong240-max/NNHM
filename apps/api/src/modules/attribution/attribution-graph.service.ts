import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AttributionTouchpointEntity } from '../../database/entities/attribution-touchpoint.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ViewingEntity } from '../../database/entities/viewing.entity';

/** P1 FR-REV-005 — attribution graph UTM/QR/call/partner → lead → viewing → booking. */
@Injectable()
export class AttributionGraphService {
  constructor(
    @InjectRepository(AttributionTouchpointEntity)
    private readonly touchpoints: Repository<AttributionTouchpointEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(ViewingEntity)
    private readonly viewings: Repository<ViewingEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
  ) {}

  async recordTouchpoint(
    tenantId: string,
    input: {
      leadId: string;
      channel: string;
      source?: string;
      campaignId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await this.touchpoints.save({
      id: `tp_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      leadId: input.leadId,
      channel: input.channel,
      source: input.source ?? null,
      campaignId: input.campaignId ?? null,
      metadata: input.metadata ?? null,
      occurredAt: new Date(),
    });
  }

  async getGraph(tenantId: string, opts?: { campaignId?: string; maskCommission?: boolean }) {
    const leads = await this.leads.find({ where: { tenantId }, take: 500, order: { createdAt: 'DESC' } });
    const leadIds = leads.map((l) => l.id);
    const [tps, views, books] = await Promise.all([
      this.touchpoints
        .createQueryBuilder('t')
        .where('t.tenant_id = :tenantId', { tenantId })
        .orderBy('t.occurred_at', 'DESC')
        .take(1000)
        .getMany(),
      leadIds.length
        ? this.viewings
            .createQueryBuilder('v')
            .where('v.tenant_id = :tenantId', { tenantId })
            .andWhere('v.lead_id IN (:...leadIds)', { leadIds })
            .getMany()
        : Promise.resolve([]),
      this.bookings.find({ where: { tenantId }, take: 500 }),
    ]);

    const bySource: Record<string, { leads: number; viewings: number; bookings: number }> = {};
    for (const lead of leads) {
      const src = lead.source ?? 'unknown';
      if (opts?.campaignId && lead.campaignId !== opts.campaignId) continue;
      bySource[src] ??= { leads: 0, viewings: 0, bookings: 0 };
      bySource[src].leads += 1;
    }
    for (const v of views) {
      const lead = leads.find((l) => l.id === v.leadId);
      if (!lead) continue;
      const src = lead.source ?? 'unknown';
      bySource[src] ??= { leads: 0, viewings: 0, bookings: 0 };
      bySource[src].viewings += 1;
    }
    for (const b of books) {
      if (!b.leadId) continue;
      const lead = leads.find((l) => l.id === b.leadId);
      if (!lead) continue;
      const src = lead.source ?? 'unknown';
      bySource[src] ??= { leads: 0, viewings: 0, bookings: 0 };
      bySource[src].bookings += 1;
    }

    return {
      data: {
        bySource: Object.entries(bySource).map(([source, counts]) => ({ source, ...counts })),
        touchpoints: tps.slice(0, 100).map((t) => ({
          id: t.id,
          leadId: t.leadId,
          channel: t.channel,
          source: t.source,
          campaignId: t.campaignId,
          occurredAt: t.occurredAt.toISOString(),
        })),
        commissionMasked: opts?.maskCommission !== false,
      },
      meta: { tenantId, uc: 'FR-REV-005' },
    };
  }
}
