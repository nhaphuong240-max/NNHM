import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  LeadConversionEventEntity,
  type LeadConversionEventType,
} from '../../database/entities/lead-conversion-event.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { HOT_SCORE_MIN } from './lead-scoring.engine';

export type HotConversionMetrics = {
  hotTotal: number;
  hotContacted: number;
  hotBooked: number;
  hotDeposited: number;
  hotConversionRate: number;
  hotResponseSlaMs: number | null;
};

@Injectable()
export class LeadConversionService {
  constructor(
    @InjectRepository(LeadConversionEventEntity)
    private readonly events: Repository<LeadConversionEventEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
  ) {}

  async record(
    tenantId: string,
    leadId: string,
    eventType: LeadConversionEventType,
    payload?: Record<string, unknown>,
  ) {
    const existing = await this.events.findOne({
      where: { tenantId, leadId, eventType },
    });
    if (existing) return existing;

    return this.events.save({
      id: `lce_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      leadId,
      eventType,
      payload: payload ?? null,
    });
  }

  /** TC-12 — HOT tier funnel: routed → contacted → booked → deposited */
  async getHotConversionMetrics(tenantId: string): Promise<HotConversionMetrics> {
    const hotLeads = await this.leads.find({
      where: { tenantId, tier: 'HOT' },
    });

    const hotTotal = hotLeads.length;
    const hotContacted = hotLeads.filter((l) => l.status !== 'NEW').length;
    const hotBooked = hotLeads.filter((l) =>
      ['BOOKING', 'WON'].includes(l.status),
    ).length;

    const depositedBookings = await this.bookings.find({
      where: { tenantId, status: 'DEPOSITED' },
    });
    const depositedLeadIds = new Set(
      hotLeads.filter((l) => l.status === 'WON').map((l) => l.id),
    );
    const hotDeposited = hotLeads.filter((l) =>
      depositedLeadIds.has(l.id) ||
      depositedBookings.some((b) => b.leadId === l.id),
    ).length;

    const hotConversionRate =
      hotTotal > 0 ? Math.round((hotDeposited / hotTotal) * 1000) / 1000 : 0;

    const routedEvents = await this.events.find({
      where: { tenantId, eventType: 'HOT_ROUTED' },
      order: { createdAt: 'ASC' },
      take: 100,
    });
    const contactedEvents = await this.events.find({
      where: { tenantId, eventType: 'CONTACTED' },
    });
    const contactedByLead = new Map(
      contactedEvents.map((e) => [e.leadId, e.createdAt.getTime()]),
    );

    const slaSamples: number[] = [];
    for (const routed of routedEvents) {
      const contactedAt = contactedByLead.get(routed.leadId);
      if (contactedAt) {
        slaSamples.push(contactedAt - routed.createdAt.getTime());
      }
    }
    const hotResponseSlaMs =
      slaSamples.length > 0
        ? Math.round(slaSamples.reduce((a, b) => a + b, 0) / slaSamples.length)
        : null;

    return {
      hotTotal,
      hotContacted,
      hotBooked,
      hotDeposited,
      hotConversionRate,
      hotResponseSlaMs,
    };
  }

  isHotLead(lead: Pick<LeadEntity, 'tier' | 'score'>) {
    return lead.tier === 'HOT' || lead.score >= HOT_SCORE_MIN;
  }
}
