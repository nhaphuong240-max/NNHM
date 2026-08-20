import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import type { AnomalyRecord, AnomalyResolveInput } from './ai-anomaly.types';
import { applyQueueStatus, scanListingAnomaly } from './ai-anomaly.util';

@Injectable()
export class AiAnomalyService {
  constructor(
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  /** UC-AI-05 · SCR-ADMIN-002 — ML-flagged ops queue (rule stub) */
  async listAnomalies(tenantId: string) {
    const rows = await this.listings.find({
      where: { tenantId },
      order: { updatedAt: 'DESC' },
      take: 100,
    });

    const unitIds = [...new Set(rows.map((r) => r.unitId))];
    const units =
      unitIds.length > 0
        ? await this.units.find({ where: { tenantId, id: In(unitIds) } })
        : [];
    const unitMap = new Map(units.map((u) => [u.id, u]));

    const unitListingCounts = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.unitId] = (acc[row.unitId] ?? 0) + 1;
      return acc;
    }, {});

    const resolutions = await this.loadResolutions(tenantId);

    const scanned: AnomalyRecord[] = [];
    for (const listing of rows) {
      const unit = unitMap.get(listing.unitId);
      if (!unit) continue;

      const anomaly = scanListingAnomaly({
        listing: {
          id: listing.id,
          unitId: listing.unitId,
          title: listing.title,
          status: listing.status,
          priceDisplay: listing.priceDisplay,
          antiDriftStatus: listing.antiDriftStatus,
          createdAt: listing.createdAt,
        },
        unit: {
          code: unit.code,
          basePrice: unit.basePrice,
          status: unit.status,
          area: unit.area,
        },
        duplicateCountOnUnit: unitListingCounts[listing.unitId] ?? 1,
      });

      if (!anomaly) continue;

      const resolution = resolutions.get(anomaly.id);
      if (resolution) {
        scanned.push(
          applyQueueStatus(anomaly, resolution.status, {
            note: resolution.note,
            resolvedAt: resolution.resolvedAt,
            resolvedBy: resolution.resolvedBy,
          }),
        );
      } else {
        scanned.push(anomaly);
      }
    }

    scanned.sort((a, b) => {
      if (a.queueStatus === 'OPEN' && b.queueStatus !== 'OPEN') return -1;
      if (b.queueStatus === 'OPEN' && a.queueStatus !== 'OPEN') return 1;
      return b.mlScore - a.mlScore;
    });

    const openCount = scanned.filter((a) => a.queueStatus === 'OPEN').length;

    await this.notifyOpenAnomalies(tenantId, scanned.filter((a) => a.queueStatus === 'OPEN'));

    return {
      data: scanned,
      meta: {
        tenantId,
        count: scanned.length,
        openCount,
        uc: ['UC-AI-05'],
        screen: 'SCR-ADMIN-002',
        mode: 'rule-stub',
      },
    };
  }

  async resolveAnomaly(
    tenantId: string,
    anomalyId: string,
    input: AnomalyResolveInput,
    actorId?: string,
  ) {
    const queue = await this.listAnomalies(tenantId);
    const target = queue.data.find((a) => a.id === anomalyId.trim());
    if (!target) {
      throw new NotFoundException({ detail: `Anomaly ${anomalyId} not found in queue` });
    }

    const action = input.action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED';
    const resolvedAt = new Date().toISOString();
    const note = input.note?.trim() || (action === 'DISMISSED' ? 'Dismissed by ops' : 'Resolved by ops');

    await this.audit.append({
      tenantId,
      entityType: 'listing_anomaly',
      entityId: anomalyId.trim(),
      action,
      payload: {
        listingId: target.listingId,
        unitId: target.unitId,
        mlScore: target.mlScore,
        note,
        resolvedAt,
      },
      actorId: actorId ?? null,
    });

    const updated = applyQueueStatus(target, action === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED', {
      note,
      resolvedAt,
      resolvedBy: actorId,
    });

    return {
      data: updated,
      meta: { uc: ['UC-AI-05'], screen: 'SCR-ADMIN-002', action },
    };
  }

  /** T7-S7 — ops SLA dashboard for anomaly queue */
  async getSlaDashboard(tenantId: string) {
    const queue = await this.listAnomalies(tenantId);
    const slaHours = Number(this.config.get<string>('ANTI_DRIFT_OPS_SLA_HOURS', '4'));
    const now = Date.now();

    const open = queue.data.filter((a) => a.queueStatus === 'OPEN');
    const breached = open.filter((a) => {
      if (!a.slaDeadlineAt) return false;
      return new Date(a.slaDeadlineAt).getTime() < now;
    });

    const resolved = queue.data.filter((a) => a.queueStatus === 'RESOLVED' && a.resolvedAt);
    const resolutionMs = resolved
      .map((a) => new Date(a.resolvedAt!).getTime() - new Date(a.flaggedAt).getTime())
      .filter((ms) => ms > 0);
    const avgResolutionHours =
      resolutionMs.length > 0
        ? Math.round((resolutionMs.reduce((a, b) => a + b, 0) / resolutionMs.length / 3600000) * 10) /
          10
        : null;

    return {
      data: {
        openCount: open.length,
        breachedSlaCount: breached.length,
        slaHours,
        avgResolutionHours,
        totalAnomalies: queue.data.length,
        criticalOpen: open.filter((a) => a.severity === 'CRITICAL').length,
      },
      meta: {
        tenantId,
        uc: ['UC-AI-05', 'T7-S7'],
        screen: 'SCR-ADMIN-002',
        opsNotification: 'audit:listing_anomaly:OPEN',
      },
    };
  }

  /** T7-S7 — enqueue ops notification for new OPEN anomalies (idempotent). */
  private async notifyOpenAnomalies(tenantId: string, open: AnomalyRecord[]) {
    if (open.length === 0) return;

    const existingOpen = await this.auditEvents.find({
      where: { tenantId, entityType: 'listing_anomaly', action: 'OPEN' },
      take: 500,
    });
    const notified = new Set(existingOpen.map((e) => e.entityId));

    for (const anomaly of open) {
      if (notified.has(anomaly.id)) continue;
      await this.audit.append({
        tenantId,
        entityType: 'listing_anomaly',
        entityId: anomaly.id,
        action: 'OPEN',
        payload: {
          listingId: anomaly.listingId,
          unitId: anomaly.unitId,
          mlScore: anomaly.mlScore,
          severity: anomaly.severity,
          signals: anomaly.signals.map((s) => s.code),
          slaDeadlineAt: anomaly.slaDeadlineAt,
          queueStatus: 'OPEN',
          opsNotification: true,
        },
        actorId: null,
      });
    }
  }

  private async loadResolutions(tenantId: string) {
    const rows = await this.auditEvents.find({
      where: { tenantId, entityType: 'listing_anomaly' },
      order: { createdAt: 'DESC' },
      take: 200,
    });

    const map = new Map<
      string,
      { status: 'RESOLVED' | 'DISMISSED'; note?: string; resolvedAt?: string; resolvedBy?: string }
    >();

    for (const row of rows) {
      if (map.has(row.entityId)) continue;
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      if (row.action !== 'RESOLVED' && row.action !== 'DISMISSED') continue;
      map.set(row.entityId, {
        status: row.action,
        note: payload.note ? String(payload.note) : undefined,
        resolvedAt: payload.resolvedAt ? String(payload.resolvedAt) : row.createdAt.toISOString(),
        resolvedBy: row.actorId ?? undefined,
      });
    }

    return map;
  }
}
