import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalkInCheckinEntity } from '../../database/entities/walk-in-checkin.entity';
import { WalkInGalleryEntity } from '../../database/entities/walk-in-gallery.entity';
import { AuditModule } from '../audit/audit.module';
import { CrmModule } from '../crm/crm.module';
import { WalkInController } from './walk-in.controller';
import { WalkInService } from './walk-in.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalkInGalleryEntity, WalkInCheckinEntity]),
    CrmModule,
    AuditModule,
  ],
  controllers: [WalkInController],
  providers: [WalkInService],
  exports: [WalkInService],
})
export class WalkInModule {}
