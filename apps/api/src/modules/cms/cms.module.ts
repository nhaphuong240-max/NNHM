import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CmsPageEntity } from '../../database/entities/cms-page.entity';
import { GeoAreaEntity } from '../../database/entities/geo-area.entity';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';

@Module({
  imports: [TypeOrmModule.forFeature([GeoAreaEntity, CmsPageEntity, SearchIndexDocEntity])],
  controllers: [CmsController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
