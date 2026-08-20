import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DocumentEntityType = 'PROJECT' | 'UNIT' | 'BOOKING' | 'TENANT';
export type DocumentFolder = 'LEGAL' | 'MARKETING' | 'CONTRACT' | 'OTHER';
export type DocumentScanStatus = 'PENDING' | 'CLEAN' | 'QUARANTINE';
export type DocumentStorageProvider = 'LOCAL' | 'S3';

@Entity({ name: 'documents' })
export class DocumentEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 16 })
  entityType!: DocumentEntityType;

  @Column({ name: 'entity_id', type: 'varchar', length: 32 })
  entityId!: string;

  @Column({ type: 'varchar', length: 16, default: 'LEGAL' })
  folder!: DocumentFolder;

  @Column({ name: 'doc_type', type: 'varchar', length: 64 })
  docType!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 128 })
  mimeType!: string;

  @Column({ name: 'size_bytes', type: 'int' })
  sizeBytes!: number;

  @Column({ name: 'content_hash', type: 'varchar', length: 64 })
  contentHash!: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 512 })
  storageKey!: string;

  @Column({ name: 'storage_provider', type: 'varchar', length: 16, default: 'LOCAL' })
  storageProvider!: DocumentStorageProvider;

  @Column({ name: 'watermark_enabled', type: 'boolean', default: true })
  watermarkEnabled!: boolean;

  @Column({ name: 'scan_status', type: 'varchar', length: 16, default: 'CLEAN' })
  scanStatus!: DocumentScanStatus;

  @Column({ name: 'retention_class', type: 'varchar', length: 32, default: '5Y' })
  retentionClass!: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'created_by', type: 'varchar', length: 32, nullable: true })
  createdBy!: string | null;

  @Index(['tenantId', 'entityType', 'entityId'])
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
