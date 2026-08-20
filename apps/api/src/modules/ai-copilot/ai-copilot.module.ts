import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from '../../database/entities/project.entity';
import { AuditModule } from '../audit/audit.module';
import { GoldenRecordModule } from '../golden-record/golden-record.module';
import { CopilotController } from './copilot.controller';
import { CopilotService } from './copilot.service';

@Module({
  imports: [GoldenRecordModule, AuditModule, TypeOrmModule.forFeature([ProjectEntity])],
  controllers: [CopilotController],
  providers: [CopilotService],
  exports: [CopilotService],
})
export class AiCopilotModule {}
