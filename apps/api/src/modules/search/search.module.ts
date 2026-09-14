import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingEntity } from '../../database/entities/listing.entity';
import { ListingMediaEntity } from '../../database/entities/listing-media.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';
import { SearchOutboxEntity } from '../../database/entities/search-outbox.entity';
import { TenantDemandPolicyEntity } from '../../database/entities/tenant-demand-policy.entity';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { SearchFreshnessJob } from './search-freshness.job';
import { SearchIndexService } from './search-index.service';
import { SearchIndexWorker } from './search-index.worker';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SearchIndexDocEntity,
      SearchOutboxEntity,
      ListingEntity,
      ListingMediaEntity,
      ProjectEntity,
      UnitEntity,
      TenantDemandPolicyEntity,
      TenantEntity,
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService, SearchIndexService, SearchIndexWorker, SearchFreshnessJob],
  exports: [SearchIndexService],
})
export class SearchModule {}
