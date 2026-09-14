import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiLeadCopilotDraftEntity } from '../../database/entities/ai-lead-copilot-draft.entity';
import { CrmActivityEntity } from '../../database/entities/crm-activity.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { ViewingEntity } from '../../database/entities/viewing.entity';
import { AuditModule } from '../audit/audit.module';
import { GoldenRecordModule } from '../golden-record/golden-record.module';
import { CopilotController } from './copilot.controller';
import { CopilotService } from './copilot.service';

@Module({
  imports: [
    GoldenRecordModule,
    AuditModule,
    TypeOrmModule.forFeature([
      ProjectEntity,
      LeadEntity,
      ViewingEntity,
      CrmActivityEntity,
      AiLeadCopilotDraftEntity,
    ]),
  ],
  controllers: [CopilotController],
  providers: [CopilotService],
  exports: [CopilotService],
})
export class AiCopilotModule {}
