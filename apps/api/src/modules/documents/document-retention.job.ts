import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleLeaderService } from '../../infrastructure/redis/schedule-leader.service';
import { DocumentEntity } from '../../database/entities/document.entity';
import { AuditService } from '../audit/audit.service';
import { isRetentionExpired } from './document-retention.util';

/** T7-S4 — enforce vault retention classes (quarantine expired docs). */
@Injectable()
export class DocumentRetentionJob {
  private readonly logger = new Logger(DocumentRetentionJob.name);

  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documents: Repository<DocumentEntity>,
    private readonly audit: AuditService,
    private readonly scheduleLeader: ScheduleLeaderService,
  ) {}

  @Cron('0 15 3 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async enforceRetention(): Promise<void> {
    if (!(await this.scheduleLeader.isLeader('document-retention', 120))) return;

    const rows = await this.documents.find({ take: 500, order: { createdAt: 'ASC' } });
    let expired = 0;

    for (const row of rows) {
      if (row.scanStatus === 'QUARANTINE') continue;
      if (!isRetentionExpired(row.createdAt, row.retentionClass)) continue;

      row.scanStatus = 'QUARANTINE';
      await this.documents.save(row);
      await this.audit.append({
        tenantId: row.tenantId,
        entityType: 'document',
        entityId: row.id,
        action: 'DOCUMENT_RETENTION_EXPIRED',
        payload: {
          retentionClass: row.retentionClass,
          folder: row.folder,
          createdAt: row.createdAt.toISOString(),
        },
        actorId: null,
      });
      expired += 1;
    }

    if (expired > 0) {
      this.logger.log(`T7-S4 retention enforced — ${expired} document(s) quarantined`);
    }
  }
}
