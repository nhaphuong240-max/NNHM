import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditModule } from '../audit/audit.module';
import { AiAnomalyController } from './ai-anomaly.controller';
import { AiAnomalyService } from './ai-anomaly.service';

@Module({
  imports: [
    AuditModule,
    TypeOrmModule.forFeature([ListingEntity, UnitEntity, AuditEventEntity]),
  ],
  controllers: [AiAnomalyController],
  providers: [AiAnomalyService],
  exports: [AiAnomalyService],
})
export class AiAnomalyModule {}
