import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';

export interface AppendAuditInput {
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  payload?: Record<string, unknown> | null;
  actorId?: string | null;
}

export interface ListAuditQuery {
  tenantId?: string;
  entityType?: string;
  entityId?: string;
  bookingId?: string;
  action?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly events: Repository<AuditEventEntity>,
  ) {}

  async append(input: AppendAuditInput): Promise<AuditEventEntity> {
    return this.events.save({
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      payload: input.payload ?? null,
      actorId: input.actorId ?? null,
    });
  }

  async list(query: ListAuditQuery) {
    const limit = Math.min(query.limit ?? 50, 200);
    const qb = this.events.createQueryBuilder('e').orderBy('e.created_at', 'DESC').take(limit);
    this.applyFilters(qb, query);

    const rows = await qb.getMany();

    return {
      data: rows.map((row) => ({
        id: String(row.id),
        attributes: {
          tenantId: row.tenantId,
          entityType: row.entityType,
          entityId: row.entityId,
          action: row.action,
          payload: row.payload,
          actorId: row.actorId,
          createdAt: row.createdAt.toISOString(),
        },
      })),
      meta: {
        count: rows.length,
        source: 'postgres',
        filters: {
          entityType: query.entityType,
          entityId: query.entityId,
          bookingId: query.bookingId,
          action: query.action,
          actorId: query.actorId,
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
        },
      },
    };
  }

  async exportCsv(query: ListAuditQuery): Promise<string> {
    const limit = Math.min(query.limit ?? 5000, 5000);
    const qb = this.events.createQueryBuilder('e').orderBy('e.created_at', 'DESC').take(limit);
    this.applyFilters(qb, query);

    const rows = await qb.getMany();
    const header = [
      'id',
      'tenant_id',
      'entity_type',
      'entity_id',
      'action',
      'actor_id',
      'created_at',
      'payload_json',
    ].join(',');

    const lines = rows.map((row) =>
      [
        row.id,
        row.tenantId,
        row.entityType,
        row.entityId,
        row.action,
        row.actorId ?? '',
        row.createdAt.toISOString(),
        JSON.stringify(row.payload ?? {}),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );

    return [header, ...lines].join('\n');
  }

  private applyFilters(
    qb: ReturnType<Repository<AuditEventEntity>['createQueryBuilder']>,
    query: ListAuditQuery,
  ) {
    if (query.tenantId) {
      qb.andWhere('e.tenant_id = :tenantId', { tenantId: query.tenantId });
    }
    if (query.entityType) {
      qb.andWhere('e.entity_type = :entityType', { entityType: query.entityType });
    }
    if (query.entityId) {
      qb.andWhere('e.entity_id = :entityId', { entityId: query.entityId });
    }
    if (query.bookingId) {
      qb.andWhere(
        `(e.entity_type = 'booking' AND e.entity_id = :bookingId) OR (e.payload->>'bookingId' = :bookingId)`,
        { bookingId: query.bookingId },
      );
    }
    if (query.action) {
      qb.andWhere('e.action = :action', { action: query.action });
    }
    if (query.actorId) {
      qb.andWhere('e.actor_id = :actorId', { actorId: query.actorId });
    }
    if (query.dateFrom) {
      qb.andWhere('e.created_at >= :dateFrom', { dateFrom: `${query.dateFrom}T00:00:00.000Z` });
    }
    if (query.dateTo) {
      qb.andWhere('e.created_at <= :dateTo', { dateTo: `${query.dateTo}T23:59:59.999Z` });
    }
  }
}
