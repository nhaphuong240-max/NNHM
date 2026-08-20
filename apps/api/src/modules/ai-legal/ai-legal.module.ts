import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from '../../database/entities/document.entity';
import { AuditModule } from '../audit/audit.module';
import { LegalRagController } from './legal-rag.controller';
import { LegalRagService } from './legal-rag.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity]), AuditModule],
  controllers: [LegalRagController],
  providers: [LegalRagService],
  exports: [LegalRagService],
})
export class AiLegalModule {}
