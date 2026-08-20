import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type MetaLeadEventStatus = 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'DUPLICATE';

@Entity({ name: 'meta_lead_events' })
export class MetaLeadEventEntity {
  @Index(['leadgenId'], { unique: true })
  @Column({ name: 'leadgen_id', type: 'varchar', length: 64 })
  leadgenId!: string;

  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'page_id', type: 'varchar', length: 64 })
  pageId!: string;

  @Column({ type: 'varchar', length: 16, default: 'PROCESSING' })
  status!: MetaLeadEventStatus;

  @Column({ name: 'lead_id', type: 'varchar', length: 32, nullable: true })
  leadId!: string | null;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  /** Webhook received → CRM lead synced (ms) */
  @Column({ name: 'ingest_ms', type: 'int', nullable: true })
  ingestMs!: number | null;

  /** Channel event time → CRM sync (ms) — OP-WIN-07 SLA metric */
  @Column({ name: 'sla_ms', type: 'int', nullable: true })
  slaMs!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
