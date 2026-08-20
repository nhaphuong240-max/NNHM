import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type SearchOutboxStatus = 'PENDING' | 'PROCESSED' | 'FAILED';
export type SearchOutboxOperation = 'UPSERT' | 'DELETE';

@Entity({ name: 'search_outbox' })
export class SearchOutboxEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['status', 'createdAt'])
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 16 })
  entityType!: 'listing' | 'unit';

  @Column({ name: 'entity_id', type: 'varchar', length: 32 })
  entityId!: string;

  @Column({ type: 'varchar', length: 16 })
  operation!: SearchOutboxOperation;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: SearchOutboxStatus;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;
}
