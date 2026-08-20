import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerEntryEntity } from '../../database/entities/ledger-entry.entity';
import { LedgerJournalEntity } from '../../database/entities/ledger-journal.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { PaymentWebhookEventEntity } from '../../database/entities/payment-webhook-event.entity';
import { ReconciliationReportEntity } from '../../database/entities/reconciliation-report.entity';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { AuditModule } from '../audit/audit.module';
import { LedgerController } from './ledger.controller';
import { LedgerReconciliationJob } from './ledger-reconciliation.job';
import { LedgerWriteService } from './ledger-write.service';
import { LedgerService } from './ledger.service';
import { ReconciliationAlertService } from './reconciliation-alert.service';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LedgerJournalEntity,
      LedgerEntryEntity,
      ReconciliationReportEntity,
      PaymentWebhookEventEntity,
      PaymentIntentEntity,
      TenantEntity,
    ]),
    AuditModule,
  ],
  controllers: [LedgerController],
  providers: [
    LedgerService,
    LedgerWriteService,
    ReconciliationService,
    ReconciliationAlertService,
    LedgerReconciliationJob,
  ],
  exports: [LedgerWriteService, LedgerService, ReconciliationService],
})
export class LedgerModule {}
