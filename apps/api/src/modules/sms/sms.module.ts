import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SmsBindingEntity } from '../../database/entities/sms-binding.entity';
import { SmsDeliveryEntity } from '../../database/entities/sms-delivery.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditModule } from '../audit/audit.module';
import { SmsIntegrationController } from './sms-integration.controller';
import { SmsPaymentNotifyService } from './sms-payment-notify.service';
import { SmsProviderClient } from './sms-provider.client';
import { SmsService } from './sms.service';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmsDeliveryEntity,
      SmsBindingEntity,
      BookingEntity,
      LeadEntity,
      UnitEntity,
    ]),
    AuditModule,
    TenantConfigModule,
  ],
  controllers: [SmsIntegrationController],
  providers: [SmsService, SmsProviderClient, SmsPaymentNotifyService],
  exports: [SmsService, SmsPaymentNotifyService],
})
export class SmsModule {}
