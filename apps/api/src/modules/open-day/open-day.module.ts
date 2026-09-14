import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadRegistrationEntity } from '../../database/entities/lead-registration.entity';
import { OpenDayEventEntity } from '../../database/entities/open-day-event.entity';
import { OpenDayRsvpEntity } from '../../database/entities/open-day-rsvp.entity';
import { CrmModule } from '../crm/crm.module';
import { OpenDayController } from './open-day.controller';
import { OpenDayService } from './open-day.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OpenDayEventEntity, OpenDayRsvpEntity, LeadRegistrationEntity]),
    CrmModule,
  ],
  controllers: [OpenDayController],
  providers: [OpenDayService],
  exports: [OpenDayService],
})
export class OpenDayModule {}
