import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitEntity } from '../../database/entities/unit.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { DeveloperTrustScoreEntity } from '../../database/entities/developer-trust-score.entity';
import { AuditModule } from '../audit/audit.module';
import { ListingModule } from '../listing/listing.module';
import { SearchModule } from '../search/search.module';
import { StreamModule } from '../stream/stream.module';
import { DeveloperTrustScoreService } from './developer-trust-score.service';
import { GoldenRecordController } from './golden-record.controller';
import { GoldenRecordTrustController } from './golden-record-trust.controller';
import { ProjectsController } from './projects.controller';
import { GoldenRecordService } from './golden-record.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UnitEntity,
      ProjectEntity,
      AuditEventEntity,
      ListingEntity,
      DeveloperTrustScoreEntity,
    ]),
    AuditModule,
    StreamModule,
    SearchModule,
    ListingModule,
  ],
  controllers: [GoldenRecordController, ProjectsController, GoldenRecordTrustController],
  providers: [GoldenRecordService, DeveloperTrustScoreService],
  exports: [GoldenRecordService, DeveloperTrustScoreService],
})
export class GoldenRecordModule {}
