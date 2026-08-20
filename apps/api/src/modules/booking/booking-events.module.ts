import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingDomainEventEntity } from '../../database/entities/booking-domain-event.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { BookingEventsService } from './booking-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([BookingDomainEventEntity, PaymentIntentEntity])],
  providers: [BookingEventsService],
  exports: [BookingEventsService],
})
export class BookingEventsModule {}
