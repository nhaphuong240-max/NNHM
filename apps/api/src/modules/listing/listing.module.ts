import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingEntity } from '../../database/entities/listing.entity';
import { ListingMediaEntity } from '../../database/entities/listing-media.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditModule } from '../audit/audit.module';
import { SearchModule } from '../search/search.module';
import { AntiDriftService } from './anti-drift.service';
import { ListingController } from './listing.controller';
import { ListingMediaController } from './listing-media.controller';
import { ListingMediaService } from './listing-media.service';
import { ListingService } from './listing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ListingEntity, ListingMediaEntity, UnitEntity]),
    AuditModule,
    SearchModule,
  ],
  controllers: [ListingController, ListingMediaController],
  providers: [ListingService, ListingMediaService, AntiDriftService],
  exports: [ListingService, ListingMediaService, AntiDriftService],
})
export class ListingModule {}
