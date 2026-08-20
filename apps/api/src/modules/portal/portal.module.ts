import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuditModule } from '../audit/audit.module';
import { BookingModule } from '../booking/booking.module';
import { PaymentModule } from '../payment/payment.module';
import { ZaloModule } from '../zalo/zalo.module';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CommissionPolicyEntity } from '../../database/entities/commission-policy.entity';
import { KycProfileEntity } from '../../database/entities/kyc-profile.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { MetaLeadEventEntity } from '../../database/entities/meta-lead-event.entity';
import { MetaPageBindingEntity } from '../../database/entities/meta-page-binding.entity';
import { MobileDeviceEntity } from '../../database/entities/mobile-device.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { ZaloLeadEventEntity } from '../../database/entities/zalo-lead-event.entity';
import { ZaloOaBindingEntity } from '../../database/entities/zalo-oa-binding.entity';
import { ZaloZnsDeliveryEntity } from '../../database/entities/zalo-zns-delivery.entity';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { BuyerDealNotifyService } from './buyer-deal-notify.service';

@Module({
  imports: [
    AnalyticsModule,
    AuditModule,
    BookingModule,
    PaymentModule,
    ZaloModule,
    TypeOrmModule.forFeature([
      LeadEntity,
      BookingEntity,
      ListingEntity,
      KycProfileEntity,
      AuditEventEntity,
      MetaLeadEventEntity,
      MetaPageBindingEntity,
      ZaloLeadEventEntity,
      ZaloOaBindingEntity,
      ZaloZnsDeliveryEntity,
      UnitEntity,
      CommissionPolicyEntity,
      PaymentIntentEntity,
      MobileDeviceEntity,
    ]),
  ],
  controllers: [PortalController],
  providers: [PortalService, BuyerDealNotifyService],
  exports: [PortalService],
})
export class PortalModule {}
