import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { TrustDisputeEntity } from '../../database/entities/trust-dispute.entity';
import { AuditModule } from '../audit/audit.module';
import { PaymentModule } from '../payment/payment.module';
import { RegulatoryExportController } from './regulatory-export.controller';
import { RegulatoryExportService } from './regulatory-export.service';
import { TrustController } from './trust.controller';
import { TrustService } from './trust.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrustDisputeEntity,
      AuditEventEntity,
      BookingEntity,
      PaymentIntentEntity,
    ]),
    AuditModule,
    PaymentModule,
  ],
  controllers: [TrustController, RegulatoryExportController],
  providers: [TrustService, RegulatoryExportService],
  exports: [TrustService, RegulatoryExportService],
})
export class TrustModule {}
