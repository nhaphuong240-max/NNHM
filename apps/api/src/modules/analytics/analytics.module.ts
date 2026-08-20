import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { KycProfileEntity } from '../../database/entities/kyc-profile.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { MetaLeadEventEntity } from '../../database/entities/meta-lead-event.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { ZaloLeadEventEntity } from '../../database/entities/zalo-lead-event.entity';
import { ZaloZnsDeliveryEntity } from '../../database/entities/zalo-zns-delivery.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AgentWauService } from './agent-wau.service';
import { DataIntelligenceService } from './data-intelligence.service';
import { DataMartJob } from './data-mart.job';
import { AiScoringModule } from '../ai-scoring/ai-scoring.module';
import { AgentActivityEventEntity } from '../../database/entities/agent-activity-event.entity';
import { AgentWauDailyEntity } from '../../database/entities/agent-wau-daily.entity';
import { DataMartDailyEntity } from '../../database/entities/data-mart-daily.entity';
import { DataProductEntitlementEntity } from '../../database/entities/data-product-entitlement.entity';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeadEntity,
      BookingEntity,
      ListingEntity,
      KycProfileEntity,
      AuditEventEntity,
      MetaLeadEventEntity,
      ZaloLeadEventEntity,
      ZaloZnsDeliveryEntity,
      PaymentIntentEntity,
      UnitEntity,
      AgentActivityEventEntity,
      AgentWauDailyEntity,
      DataMartDailyEntity,
      DataProductEntitlementEntity,
      TenantEntity,
    ]),
    AiScoringModule,
    RedisModule,
    TenantConfigModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AgentWauService, DataIntelligenceService, DataMartJob],
  exports: [AnalyticsService, AgentWauService, DataIntelligenceService],
})
export class AnalyticsModule {}
