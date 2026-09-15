import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CmsHomepageConfigEntity } from '../../database/entities/cms-homepage-config.entity';
import { CmsPageEntity } from '../../database/entities/cms-page.entity';
import { GeoAreaEntity } from '../../database/entities/geo-area.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';
import { CmsHomepageService } from './cms-homepage.service';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GeoAreaEntity,
      CmsPageEntity,
      CmsHomepageConfigEntity,
      SearchIndexDocEntity,
      ProjectEntity,
    ]),
  ],
  controllers: [CmsController],
  providers: [CmsService, CmsHomepageService],
  exports: [CmsService, CmsHomepageService],
})
export class CmsModule {}
