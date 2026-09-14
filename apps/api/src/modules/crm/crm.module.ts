import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmActivityEntity } from '../../database/entities/crm-activity.entity';
import { ViewingEntity } from '../../database/entities/viewing.entity';
import { LeadRegistrationEntity } from '../../database/entities/lead-registration.entity';
import { SavedSearchEntity } from '../../database/entities/saved-search.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { MetaLeadEventEntity } from '../../database/entities/meta-lead-event.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { ZaloLeadEventEntity } from '../../database/entities/zalo-lead-event.entity';
import { AuditModule } from '../audit/audit.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { AiScoringModule } from '../ai-scoring/ai-scoring.module';
import { SmsModule } from '../sms/sms.module';
import { StreamModule } from '../stream/stream.module';
import { ZaloModule } from '../zalo/zalo.module';
import { MobileAgentModule } from '../mobile-agent/mobile-agent.module';
import { ActivitiesController } from './activities.controller';
import { CrmSlaController } from './crm-sla.controller';
import { CrmInboxController } from './crm-inbox.controller';
import { CrmInboxDeliveryService } from './crm-inbox-delivery.service';
import { CrmInboxService } from './crm-inbox.service';
import { CrmRoutingController } from './crm-routing.controller';
import { CrmRoutingService } from './crm-routing.service';
import { TenantDemandPolicyEntity } from '../../database/entities/tenant-demand-policy.entity';
import { CrmRoutingRuleEntity } from '../../database/entities/crm-routing-rule.entity';
import { SlaBreachLogEntity } from '../../database/entities/sla-breach-log.entity';
import { DealDisputeEntity } from '../../database/entities/deal-dispute.entity';
import { DealDisputeEventEntity } from '../../database/entities/deal-dispute-event.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { CrmDemandPolicyController } from './crm-demand-policy.controller';
import { CrmDemandController } from './crm-demand.controller';
import { CrmDemandService } from './crm-demand.service';
import { DemandPolicyService } from './demand-policy.service';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { CrmHotSlaService } from './crm-hot-sla.service';
import { CrmTodayController } from './crm-today.controller';
import { DealDisputeService } from './deal-dispute.service';
import { DealDisputeController } from './deal-dispute.controller';
import { SavedSearchAlertJob } from './saved-search-alert.job';
import { DealProtectionJob } from './deal-protection.job';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeadEntity,
      CrmActivityEntity,
      ViewingEntity,
      LeadRegistrationEntity,
      SavedSearchEntity,
      TenantDemandPolicyEntity,
      CrmRoutingRuleEntity,
      SlaBreachLogEntity,
      DealDisputeEntity,
      DealDisputeEventEntity,
      ListingEntity,
      TenantEntity,
      UserEntity,
      MetaLeadEventEntity,
      ZaloLeadEventEntity,
    ]),
    AuditModule,
    ComplianceModule,
    StreamModule,
    AiScoringModule,
    SmsModule,
    forwardRef(() => ZaloModule),
    forwardRef(() => MobileAgentModule),
  ],
  controllers: [
    CrmController,
    ActivitiesController,
    CrmRoutingController,
    CrmSlaController,
    CrmInboxController,
    CrmDemandController,
    CrmDemandPolicyController,
    CrmTodayController,
    DealDisputeController,
  ],
  providers: [
    CrmService,
    CrmRoutingService,
    CrmInboxService,
    CrmInboxDeliveryService,
    CrmDemandService,
    DemandPolicyService,
    CrmHotSlaService,
    DealDisputeService,
    SavedSearchAlertJob,
    DealProtectionJob,
  ],
  exports: [CrmService, CrmInboxService, DemandPolicyService, CrmHotSlaService],
})
export class CrmModule {}
