import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DsrPolygonEntity } from '../../database/entities/dsr-polygon.entity';
import { DsrShareLinkEntity } from '../../database/entities/dsr-share-link.entity';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DsrController } from './dsr.controller';
import { DsrService } from './dsr.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DsrPolygonEntity, DsrShareLinkEntity, SearchIndexDocEntity]),
    AnalyticsModule,
  ],
  controllers: [DsrController],
  providers: [DsrService],
  exports: [DsrService],
})
export class DsrModule {}
