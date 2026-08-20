import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentAccessLogEntity } from '../../database/entities/document-access-log.entity';
import { DocumentEntity } from '../../database/entities/document.entity';
import { AuditModule } from '../audit/audit.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentRetentionJob } from './document-retention.job';
import { LocalDocumentStorageAdapter } from './storage/local-storage.adapter';
import { S3DocumentStorageAdapter } from './storage/s3-storage.adapter';
import { DOCUMENT_STORAGE_ADAPTER } from './storage/storage.types';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity, DocumentAccessLogEntity]),
    AuditModule,
    ComplianceModule,
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentRetentionJob,
    LocalDocumentStorageAdapter,
    S3DocumentStorageAdapter,
    {
      provide: DOCUMENT_STORAGE_ADAPTER,
      useFactory: (config: ConfigService, local: LocalDocumentStorageAdapter, s3: S3DocumentStorageAdapter) => {
        const mode = config.get<string>('DOCUMENTS_STORAGE', 'local').toLowerCase();
        return mode === 's3' ? s3 : local;
      },
      inject: [ConfigService, LocalDocumentStorageAdapter, S3DocumentStorageAdapter],
    },
  ],
  exports: [DocumentsService, DOCUMENT_STORAGE_ADAPTER],
})
export class DocumentsModule {}
