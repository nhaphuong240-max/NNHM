import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadConversionEventEntity } from '../../database/entities/lead-conversion-event.entity';
import { LeadScoringOutboxEntity } from '../../database/entities/lead-scoring-outbox.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { CrmRoutingRuleEntity } from '../../database/entities/crm-routing-rule.entity';
import { AuditModule } from '../audit/audit.module';
import { StreamModule } from '../stream/stream.module';
import { AiEvalController } from './ai-eval.controller';
import { AiEvalService } from './ai-eval.service';
import { LeadConversionService } from './lead-conversion.service';
import { LeadRoutingService } from './lead-routing.service';
import { LeadScoringController } from './lead-scoring.controller';
import { LeadScoringService } from './lead-scoring.service';
import { LeadScoringWorker } from './lead-scoring.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeadScoringOutboxEntity,
      LeadEntity,
      UserEntity,
      CrmRoutingRuleEntity,
      LeadConversionEventEntity,
      BookingEntity,
    ]),
    AuditModule,
    StreamModule,
  ],
  controllers: [LeadScoringController, AiEvalController],
  providers: [
    LeadScoringService,
    LeadRoutingService,
    LeadScoringWorker,
    LeadConversionService,
    AiEvalService,
  ],
  exports: [LeadScoringService, LeadConversionService, AiEvalService],
})
export class AiScoringModule {}
