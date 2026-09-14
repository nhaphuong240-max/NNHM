import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmNotifyDeliveryEntity } from '../../database/entities/crm-notify-delivery.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SmsBindingEntity } from '../../database/entities/sms-binding.entity';
import { ZaloOaBindingEntity } from '../../database/entities/zalo-oa-binding.entity';
import { SmsModule } from '../sms/sms.module';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';
import { NotifyController } from './notify.controller';
import { NotifyRailsService } from './notify-rails.service';
import { NotifyService } from './notify.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CrmNotifyDeliveryEntity,
      LeadEntity,
      SmsBindingEntity,
      ZaloOaBindingEntity,
    ]),
    SmsModule,
    TenantConfigModule,
  ],
  controllers: [NotifyController],
  providers: [NotifyService, NotifyRailsService],
  exports: [NotifyService, NotifyRailsService],
})
export class NotifyModule {}
