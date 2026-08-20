import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentLedgerEntryEntity } from '../../database/entities/consent-ledger-entry.entity';
import { AuditModule } from '../audit/audit.module';
import { ComplianceController } from './compliance.controller';
import { ConsentLedgerService } from './consent-ledger.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConsentLedgerEntryEntity]), AuditModule],
  controllers: [ComplianceController],
  providers: [ConsentLedgerService],
  exports: [ConsentLedgerService],
})
export class ComplianceModule {}
