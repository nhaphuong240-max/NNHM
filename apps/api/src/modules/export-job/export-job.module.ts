import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportJobEntity } from '../../database/entities/export-jobs.entity';
import { ExportJobController } from './export-job.controller';
import { ExportJobService } from './export-job.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExportJobEntity])],
  controllers: [ExportJobController],
  providers: [ExportJobService],
  exports: [ExportJobService],
})
export class ExportJobModule {}
