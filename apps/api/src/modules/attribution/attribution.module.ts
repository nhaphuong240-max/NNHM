import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttributionTouchpointEntity } from '../../database/entities/attribution-touchpoint.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ViewingEntity } from '../../database/entities/viewing.entity';
import { AttributionController } from './attribution.controller';
import { AttributionGraphService } from './attribution-graph.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttributionTouchpointEntity,
      LeadEntity,
      ViewingEntity,
      BookingEntity,
    ]),
  ],
  controllers: [AttributionController],
  providers: [AttributionGraphService],
  exports: [AttributionGraphService],
})
export class AttributionModule {}
