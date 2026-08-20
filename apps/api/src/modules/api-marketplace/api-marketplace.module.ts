import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiPartnerEntity } from '../../database/entities/api-partner.entity';
import { ApiPartnerKeyEntity } from '../../database/entities/api-partner-key.entity';
import { ApiWebhookDeliveryEntity } from '../../database/entities/api-webhook-delivery.entity';
import { AuditModule } from '../audit/audit.module';
import { ApiMarketplaceController } from './api-marketplace.controller';
import { ApiMarketplaceService } from './api-marketplace.service';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';

@Module({
  imports: [
    AuditModule,
    TenantConfigModule,
    TypeOrmModule.forFeature([ApiPartnerEntity, ApiPartnerKeyEntity, ApiWebhookDeliveryEntity]),
  ],
  controllers: [ApiMarketplaceController],
  providers: [ApiMarketplaceService],
  exports: [ApiMarketplaceService],
})
export class ApiMarketplaceModule {}
