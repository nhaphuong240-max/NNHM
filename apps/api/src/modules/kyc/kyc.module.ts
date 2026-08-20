import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycProfileEntity } from '../../database/entities/kyc-profile.entity';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditModule } from '../audit/audit.module';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Module({
  imports: [TypeOrmModule.forFeature([KycProfileEntity, AuditEventEntity]), AuditModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
