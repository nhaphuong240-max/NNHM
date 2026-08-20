import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { CommissionDisputeEntity } from '../../database/entities/commission-dispute.entity';
import { CommissionEntryEntity } from '../../database/entities/commission-entry.entity';
import { CommissionPolicyEntity } from '../../database/entities/commission-policy.entity';
import { CommissionSettlementRunEntity } from '../../database/entities/commission-settlement-run.entity';
import { CommissionSnapshotEntity } from '../../database/entities/commission-snapshot.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditModule } from '../audit/audit.module';
import { KycModule } from '../kyc/kyc.module';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';
import { CommissionController } from './commission.controller';
import { CommissionExportService } from './commission-export.service';
import { CommissionPayoutClient } from './commission-payout.client';
import { CommissionPolicyService } from './commission-policy.service';
import { CommissionSettlementService } from './commission-settlement.service';
import { CommissionSettlementSchedulerService } from './commission-settlement-scheduler.service';
import { CommissionSettlementJob } from './commission-settlement.job';
import { CommissionSnapshotService } from './commission-snapshot.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommissionPolicyEntity,
      CommissionSnapshotEntity,
      CommissionEntryEntity,
      CommissionDisputeEntity,
      CommissionSettlementRunEntity,
      AuditEventEntity,
      TenantEntity,
      ProjectEntity,
      BookingEntity,
      UnitEntity,
    ]),
    AuditModule,
    KycModule,
    TenantConfigModule,
  ],
  controllers: [CommissionController],
  providers: [
    CommissionPolicyService,
    CommissionSnapshotService,
    CommissionSettlementService,
    CommissionSettlementSchedulerService,
    CommissionSettlementJob,
    CommissionExportService,
    CommissionPayoutClient,
  ],
  exports: [
    CommissionPolicyService,
    CommissionSnapshotService,
    CommissionSettlementService,
    CommissionExportService,
  ],
})
export class CommissionModule {}
