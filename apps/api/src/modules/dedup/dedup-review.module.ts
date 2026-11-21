import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerEntity } from '../../database/entities/customers.entity';
import { DedupReviewEntity } from '../../database/entities/dedup-reviews.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { TenantDemandPolicyEntity } from '../../database/entities/tenant-demand-policy.entity';
import { DedupReviewController } from './dedup-review.controller';
import { DedupReviewService } from './dedup-review.service';

@Module({
  imports: [TypeOrmModule.forFeature([LeadEntity, CustomerEntity, DedupReviewEntity, TenantDemandPolicyEntity])],
  controllers: [DedupReviewController],
  providers: [DedupReviewService],
  exports: [DedupReviewService],
})
export class DedupReviewModule {}
