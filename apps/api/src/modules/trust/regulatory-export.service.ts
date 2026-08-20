import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Between, Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { AuditService } from '../audit/audit.service';
import { PaymentEscrowService } from '../payment/payment-escrow.service';
import {
  buildRegulatoryManifest,
  type RegulatoryExportJob,
  type RegulatoryExportScope,
} from './regulatory-export.util';
import {
  encryptRegulatoryPayload,
  decryptRegulatoryPayload,
  isRegulatoryExportStub,
  type EncryptedExportPayload,
} from './regulatory-export-crypto.util';

@Injectable()
export class RegulatoryExportService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(PaymentIntentEntity)
    private readonly payments: Repository<PaymentIntentEntity>,
    private readonly audit: AuditService,
    private readonly escrow: PaymentEscrowService,
    private readonly config: ConfigService,
  ) {}

  /** UC-TR-04 · SCR-ADMIN-018 */
  async createJob(
    tenantId: string,
    input: {
      scope: RegulatoryExportScope;
      dateFrom: string;
      dateTo: string;
      legalTicketId?: string;
    },
    actorId?: string,
  ) {
    const jobId = `rex_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const from = new Date(input.dateFrom);
    const to = new Date(input.dateTo);

    const [auditCount, bookingCount, paymentCount, escrowCount] = await Promise.all([
      this.auditEvents.count({
        where: { tenantId, createdAt: Between(from, to) },
      }),
      this.bookings.count({
        where: { tenantId, createdAt: Between(from, to) },
      }),
      this.payments.count({
        where: { tenantId, createdAt: Between(from, to) },
      }),
      input.scope === 'ESCROW_NHNN'
        ? this.escrow.countEscrowForExport(tenantId, from, to)
        : Promise.resolve(0),
    ]);

    const encryptionStub = isRegulatoryExportStub(
      this.config.get<string>('REGULATORY_EXPORT_STUB'),
    );

    const { sha256, csv, manifest } = buildRegulatoryManifest({
      jobId,
      tenantId,
      scope: input.scope,
      auditCount,
      bookingCount,
      paymentCount,
      escrowCount,
      encryptionStub,
    });

    let encryptedCsv: EncryptedExportPayload | undefined;
    if (!encryptionStub) {
      const key = this.config.get<string>('REGULATORY_EXPORT_ENCRYPTION_KEY');
      if (!key || key.length < 32) {
        throw new Error('REGULATORY_EXPORT_ENCRYPTION_KEY required (≥32 chars) when REGULATORY_EXPORT_STUB=false');
      }
      encryptedCsv = encryptRegulatoryPayload(csv, key);
    }

    const createdAt = new Date().toISOString();
    const readyAt = new Date().toISOString();
    const downloadExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const job: RegulatoryExportJob = {
      id: jobId,
      scope: input.scope,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      status: 'READY',
      manifestSha256: sha256,
      fileCount: input.scope === 'FULL' ? 3 : input.scope === 'ESCROW_NHNN' ? 2 : 1,
      createdAt,
      readyAt,
      downloadExpiresAt,
    };

    await this.audit.append({
      tenantId,
      entityType: 'regulatory_export_job',
      entityId: jobId,
      action: 'CREATE',
      payload: {
        job,
        legalTicketId: input.legalTicketId?.trim() || undefined,
        manifest,
        csv: encryptionStub ? csv : undefined,
        encryptedCsv,
      },
      actorId: actorId ?? null,
    });

    return {
      data: job,
      meta: { uc: ['UC-TR-04'], screen: 'SCR-ADMIN-018', status: 'READY' },
    };
  }

  async getJob(tenantId: string, jobId: string) {
    const row = await this.auditEvents.findOne({
      where: { tenantId, entityType: 'regulatory_export_job', entityId: jobId.trim() },
      order: { createdAt: 'DESC' },
    });
    if (!row) {
      throw new NotFoundException({ detail: `Export job ${jobId} not found` });
    }
    const payload = (row.payload ?? {}) as { job?: RegulatoryExportJob };
    return {
      data: payload.job,
      meta: { uc: ['UC-TR-04'], screen: 'SCR-ADMIN-018' },
    };
  }

  async downloadPack(tenantId: string, jobId: string) {
    const row = await this.auditEvents.findOne({
      where: { tenantId, entityType: 'regulatory_export_job', entityId: jobId.trim() },
      order: { createdAt: 'DESC' },
    });
    if (!row) {
      throw new NotFoundException({ detail: `Export job ${jobId} not found` });
    }

    const payload = (row.payload ?? {}) as {
      job?: RegulatoryExportJob;
      csv?: string;
      encryptedCsv?: EncryptedExportPayload;
      manifest?: Record<string, unknown>;
    };

    let csv = payload.csv ?? '';
    if (!csv && payload.encryptedCsv) {
      const key = this.config.get<string>('REGULATORY_EXPORT_ENCRYPTION_KEY', '');
      csv = decryptRegulatoryPayload(payload.encryptedCsv, key);
    }

    await this.audit.append({
      tenantId,
      entityType: 'regulatory_export_job',
      entityId: jobId,
      action: 'DOWNLOAD',
      payload: { downloadedAt: new Date().toISOString() },
      actorId: null,
    });

    return {
      data: {
        job: payload.job,
        manifest: payload.manifest,
        csv,
      },
      meta: { uc: ['UC-TR-04'], screen: 'SCR-ADMIN-018', mode: 'download' },
    };
  }

  async listJobs(tenantId: string) {
    const rows = await this.auditEvents.find({
      where: { tenantId, entityType: 'regulatory_export_job', action: 'CREATE' },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const data = rows
      .map((row) => (row.payload as { job?: RegulatoryExportJob })?.job)
      .filter(Boolean) as RegulatoryExportJob[];

    return {
      data,
      meta: { tenantId, count: data.length, uc: ['UC-TR-04'], screen: 'SCR-ADMIN-018' },
    };
  }
}
