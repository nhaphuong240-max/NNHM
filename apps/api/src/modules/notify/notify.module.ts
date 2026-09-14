import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmNotifyDeliveryEntity } from '../../database/entities/crm-notify-delivery.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SmsModule } from '../sms/sms.module';
import { NotifyController } from './notify.controller';
import { NotifyService } from './notify.service';

@Module({
  imports: [TypeOrmModule.forFeature([CrmNotifyDeliveryEntity, LeadEntity]), SmsModule],
  controllers: [NotifyController],
  providers: [NotifyService],
  exports: [NotifyService],
})
export class NotifyModule {}
