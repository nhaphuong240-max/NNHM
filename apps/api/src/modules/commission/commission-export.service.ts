import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { CommissionEntryEntity } from '../../database/entities/commission-entry.entity';
import { CommissionSnapshotEntity } from '../../database/entities/commission-snapshot.entity';
import { AuditService } from '../audit/audit.service';
import {
  buildCommissionExportJobMeta,
  type CommissionExportJob,
} from './commission-export.util';

@Injectable()
export class CommissionExportService {
  constructor(
    @InjectRepository(CommissionSnapshotEntity)
    private readonly snapshots: Repository<CommissionSnapshotEntity>,
    @InjectRepository(CommissionEntryEntity)
    private readonly entries: Repository<CommissionEntryEntity>,
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    private readonly audit: AuditService,
  ) {}

  /** UC-COM-05 — CSV export for accounting */
  async exportCsv(tenantId: string, dateFrom?: string, dateTo?: string): Promise<string> {
    const qb = this.entries
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .orderBy('e.created_at', 'ASC');

    if (dateFrom) {
      qb.andWhere('e.created_at >= :dateFrom', { dateFrom: `${dateFrom}T00:00:00.000Z` });
    }
    if (dateTo) {
      qb.andWhere('e.created_at <= :dateTo', { dateTo: `${dateTo}T23:59:59.999Z` });
    }

    const rows = await qb.getMany();
    const snapshotIds = [...new Set(rows.map((r) => r.snapshotId))];
    const snapshots = snapshotIds.length
      ? await this.snapshots.find({ where: { tenantId, id: In(snapshotIds) } })
      : [];

    const bookingBySnapshot = new Map(snapshots.map((s) => [s.id, s.bookingId]));

    const header = [
      'entry_id',
      'snapshot_id',
      'booking_id',
      'recipient_type',
      'recipient_id',
      'role',
      'split_percent',
      'amount_vnd',
      'settlement_run_id',
      'payout_status',
      'created_at',
    ].join(',');

    const lines = rows.map((entry) =>
      [
        entry.id,
        entry.snapshotId,
        bookingBySnapshot.get(entry.snapshotId) ?? '',
        entry.recipientType,
        entry.recipientId,
        entry.role,
        entry.splitPercent,
        entry.amount,
        entry.settlementRunId ?? '',
        entry.payoutStatus,
        entry.createdAt.toISOString(),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );

    return [header, ...lines].join('\n');
  }

  /** UC-COM-05 — async export job (audit-backed, regulatory-export pattern) */
  async createExportJob(
    tenantId: string,
    input: { dateFrom?: string; dateTo?: string },
    actorId?: string,
  ) {
    const jobId = `cex_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const csv = await this.exportCsv(tenantId, input.dateFrom?.trim(), input.dateTo?.trim());
    const rowCount = Math.max(0, csv.split('\n').length - 1);
    const { job, sha256 } = buildCommissionExportJobMeta({
      jobId,
      dateFrom: input.dateFrom?.trim(),
      dateTo: input.dateTo?.trim(),
      csv,
      rowCount,
    });

    await this.audit.append({
      tenantId,
      entityType: 'commission_export_job',
      entityId: jobId,
      action: 'CREATE',
      payload: { job, csv, csvSha256: sha256 },
      actorId: actorId ?? null,
    });

    return {
      data: job,
      meta: { uc: ['UC-COM-05'], screen: 'SCR-FIN-001', status: job.status },
    };
  }

  async getExportJob(tenantId: string, jobId: string) {
    const row = await this.auditEvents.findOne({
      where: { tenantId, entityType: 'commission_export_job', entityId: jobId.trim() },
      order: { createdAt: 'DESC' },
    });
    if (!row) {
      throw new NotFoundException({ detail: `Commission export job ${jobId} not found` });
    }
    const payload = (row.payload ?? {}) as { job?: CommissionExportJob };
    return {
      data: payload.job,
      meta: { uc: ['UC-COM-05'], screen: 'SCR-FIN-001' },
    };
  }

  async downloadExportJob(tenantId: string, jobId: string) {
    const row = await this.auditEvents.findOne({
      where: { tenantId, entityType: 'commission_export_job', entityId: jobId.trim() },
      order: { createdAt: 'DESC' },
    });
    if (!row) {
      throw new NotFoundException({ detail: `Commission export job ${jobId} not found` });
    }

    const payload = (row.payload ?? {}) as { job?: CommissionExportJob; csv?: string };

    await this.audit.append({
      tenantId,
      entityType: 'commission_export_job',
      entityId: jobId,
      action: 'DOWNLOAD',
      payload: { downloadedAt: new Date().toISOString() },
      actorId: null,
    });

    return {
      data: {
        job: payload.job,
        csv: payload.csv ?? '',
      },
      meta: { uc: ['UC-COM-05'], screen: 'SCR-FIN-001', mode: 'download' },
    };
  }

  async listExportJobs(tenantId: string) {
    const rows = await this.auditEvents.find({
      where: { tenantId, entityType: 'commission_export_job', action: 'CREATE' },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const data = rows
      .map((row) => (row.payload as { job?: CommissionExportJob })?.job)
      .filter(Boolean) as CommissionExportJob[];

    return {
      data,
      meta: { tenantId, count: data.length, uc: ['UC-COM-05'], screen: 'SCR-FIN-001' },
    };
  }
}
