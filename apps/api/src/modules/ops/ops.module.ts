import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingEntity } from '../../database/entities/listing.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { HealthOpsController } from './health-ops.controller';
import { OpsController } from './ops.controller';
import { OpsReadinessService } from './ops-readiness.service';
import { OpsService } from './ops.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentIntentEntity, ListingEntity]), LedgerModule],
  controllers: [OpsController, HealthOpsController],
  providers: [OpsService, OpsReadinessService],
  exports: [OpsService],
})
export class OpsModule {}
