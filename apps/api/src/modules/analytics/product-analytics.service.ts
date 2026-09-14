import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  AnalyticsEventEntity,
  type AnalyticsEventName,
} from '../../database/entities/analytics-event.entity';

export type TrackEventInput = {
  tenantId: string;
  name: AnalyticsEventName;
  source: string;
  consentBasis?: string;
  sessionId?: string;
  visitorId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
};

/** Strip raw PII from analytics payload — hash phone if present. */
export function sanitizeAnalyticsPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...payload };
  if (typeof out.phone === 'string' && out.phone.trim()) {
    out.phoneHash = createHash('sha256').update(out.phone.trim()).digest('hex').slice(0, 16);
    delete out.phone;
  }
  if (typeof out.email === 'string') delete out.email;
  if (typeof out.fullName === 'string') delete out.fullName;
  return out;
}

@Injectable()
export class ProductAnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEventEntity)
    private readonly events: Repository<AnalyticsEventEntity>,
  ) {}

  async track(input: TrackEventInput) {
    const id = `ae_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const row = await this.events.save({
      id,
      tenantId: input.tenantId,
      name: input.name,
      source: input.source,
      consentBasis: input.consentBasis ?? 'legitimate_interest',
      sessionId: input.sessionId ?? null,
      visitorId: input.visitorId ?? null,
      userId: input.userId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      payload: sanitizeAnalyticsPayload(input.payload ?? {}),
    });
    return { data: { id: row.id, name: row.name }, meta: { recorded: true } };
  }

  async trackBatch(tenantId: string, items: Omit<TrackEventInput, 'tenantId'>[]) {
    const results = [];
    for (const item of items.slice(0, 20)) {
      results.push(await this.track({ tenantId, ...item }));
    }
    return { data: results.map((r) => r.data), meta: { count: results.length } };
  }

  async countByName(tenantId: string, name: AnalyticsEventName, since: Date) {
    return this.events
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.name = :name', { name })
      .andWhere('e.created_at >= :since', { since })
      .getCount();
  }
}
