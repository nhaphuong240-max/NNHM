import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeoAreaEntity } from '../../database/entities/geo-area.entity';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';
import { LocalityInsightService } from './locality-insight.service';
import { MarketInsightController } from './market-insight.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SearchIndexDocEntity, GeoAreaEntity])],
  controllers: [MarketInsightController],
  providers: [LocalityInsightService],
  exports: [LocalityInsightService],
})
export class MarketInsightModule {}
