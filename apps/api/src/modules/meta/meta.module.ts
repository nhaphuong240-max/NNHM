import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaLeadEventEntity } from '../../database/entities/meta-lead-event.entity';
import { MetaPageBindingEntity } from '../../database/entities/meta-page-binding.entity';
import { AuditModule } from '../audit/audit.module';
import { CrmModule } from '../crm/crm.module';
import { MetaGraphClient } from './meta-graph.client';
import { MetaIntegrationController } from './meta-integration.controller';
import { MetaLeadService } from './meta-lead.service';
import { MetaOAuthController } from './meta-oauth.controller';
import { MetaOAuthService } from './meta-oauth.service';
import { MetaWebhookController } from './meta-webhook.controller';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MetaLeadEventEntity, MetaPageBindingEntity]),
    CrmModule,
    AuditModule,
    TenantConfigModule,
  ],
  controllers: [MetaWebhookController, MetaIntegrationController, MetaOAuthController],
  providers: [MetaLeadService, MetaGraphClient, MetaOAuthService],
  exports: [MetaLeadService, MetaOAuthService],
})
export class MetaModule {}
