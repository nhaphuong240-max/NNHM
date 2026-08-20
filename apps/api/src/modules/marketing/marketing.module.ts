import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgencyApplicationEntity } from '../../database/entities/agency-application.entity';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { DistributionPolicyEntity } from '../../database/entities/distribution-policy.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { MarketingMarketplaceAdminController } from './marketing-marketplace-admin.controller';
import { MarketingMarketplaceAdminService } from './marketing-marketplace-admin.service';
import { MarketingLeaderboardController } from './marketing-leaderboard.controller';
import { MarketingLeaderboardService } from './marketing-leaderboard.service';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DistributionPolicyEntity,
      AgencyApplicationEntity,
      ProjectEntity,
      TenantEntity,
      LeadEntity,
      AuditEventEntity,
      BookingEntity,
    ]),
    AuditModule,
    IdentityModule,
  ],
  controllers: [MarketingController, MarketingMarketplaceAdminController, MarketingLeaderboardController],
  providers: [MarketingService, MarketingMarketplaceAdminService, MarketingLeaderboardService],
  exports: [MarketingService, MarketingMarketplaceAdminService, MarketingLeaderboardService],
})
export class MarketingModule {}
