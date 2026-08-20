import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { AuditModule } from '../audit/audit.module';
import { CrmModule } from '../crm/crm.module';
import { AiReplyController } from './ai-reply.controller';
import { AiReplyLlmClient } from './ai-reply-llm.client';
import { AiReplyService } from './ai-reply.service';

@Module({
  imports: [TypeOrmModule.forFeature([LeadEntity]), AuditModule, CrmModule],
  controllers: [AiReplyController],
  providers: [AiReplyService, AiReplyLlmClient],
  exports: [AiReplyService],
})
export class AiReplyModule {}
