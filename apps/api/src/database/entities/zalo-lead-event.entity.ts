import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ZaloLeadEventStatus = 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'DUPLICATE';

@Entity({ name: 'zalo_lead_events' })
export class ZaloLeadEventEntity {
  @Index(['msgId'], { unique: true })
  @Column({ name: 'msg_id', type: 'varchar', length: 64 })
  msgId!: string;

  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'oa_id', type: 'varchar', length: 64 })
  oaId!: string;

  @Column({ type: 'varchar', length: 16, default: 'PROCESSING' })
  status!: ZaloLeadEventStatus;

  @Column({ name: 'lead_id', type: 'varchar', length: 32, nullable: true })
  leadId!: string | null;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @Column({ name: 'ingest_ms', type: 'int', nullable: true })
  ingestMs!: number | null;

  @Column({ name: 'sla_ms', type: 'int', nullable: true })
  slaMs!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
