import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export type DocumentAccessAction = 'UPLOAD' | 'DOWNLOAD' | 'DELETE' | 'PRESIGN';

@Entity({ name: 'document_access_logs' })
export class DocumentAccessLogEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'document_id', type: 'varchar', length: 32 })
  documentId!: string;

  @Column({ type: 'varchar', length: 16 })
  action!: DocumentAccessAction;

  @Column({ name: 'actor_id', type: 'varchar', length: 32, nullable: true })
  actorId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Index(['tenantId', 'documentId', 'createdAt'])
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
