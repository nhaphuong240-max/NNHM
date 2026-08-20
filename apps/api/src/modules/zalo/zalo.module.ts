import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { ZaloLeadEventEntity } from '../../database/entities/zalo-lead-event.entity';
import { ZaloOaBindingEntity } from '../../database/entities/zalo-oa-binding.entity';
import { ZaloZnsDeliveryEntity } from '../../database/entities/zalo-zns-delivery.entity';
import { AuditModule } from '../audit/audit.module';
import { CrmModule } from '../crm/crm.module';
import { ZaloGraphClient } from './zalo-graph.client';
import { ZaloIntegrationController } from './zalo-integration.controller';
import { ZaloLeadService } from './zalo-lead.service';
import { ZaloOAuthController } from './zalo-oauth.controller';
import { ZaloOAuthService } from './zalo-oauth.service';
import { ZaloPaymentNotifyService } from './zalo-payment-notify.service';
import { ZaloTokenService } from './zalo-token.service';
import { ZaloWebhookController } from './zalo-webhook.controller';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ZaloLeadEventEntity,
      ZaloOaBindingEntity,
      ZaloZnsDeliveryEntity,
      BookingEntity,
      LeadEntity,
      UnitEntity,
    ]),
    forwardRef(() => CrmModule),
    AuditModule,
    TenantConfigModule,
  ],
  controllers: [ZaloWebhookController, ZaloIntegrationController, ZaloOAuthController],
  providers: [
    ZaloLeadService,
    ZaloGraphClient,
    ZaloTokenService,
    ZaloOAuthService,
    ZaloPaymentNotifyService,
  ],
  exports: [
    ZaloLeadService,
    ZaloGraphClient,
    ZaloTokenService,
    ZaloOAuthService,
    ZaloPaymentNotifyService,
  ],
})
export class ZaloModule {}
