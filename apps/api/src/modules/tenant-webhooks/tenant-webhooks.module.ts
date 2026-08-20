import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditModule } from '../audit/audit.module';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';
import { TenantWebhookController } from './tenant-webhook.controller';
import { TenantWebhookRetryJob } from './tenant-webhook-retry.job';
import { TenantWebhookRetryService } from './tenant-webhook-retry.service';
import { TenantWebhookService } from './tenant-webhook.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditEventEntity]), AuditModule, TenantConfigModule],
  controllers: [TenantWebhookController],
  providers: [TenantWebhookService, TenantWebhookRetryService, TenantWebhookRetryJob],
  exports: [TenantWebhookService],
})
export class TenantWebhooksModule {}
