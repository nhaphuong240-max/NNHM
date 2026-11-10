import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'evidence_records' })
@Index(['tenantId', 'actorId', 'action', 'correlationId'], { unique: true })
export class EvidenceRecordEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'actor_id', type: 'varchar', length: 128 })
  actorId!: string;

  @Column({ name: 'action', type: 'varchar', length: 64 })
  action!: string;

  @Column({ name: 'scope', type: 'text' })
  scope!: string;

  @Column({ name: 'reason', type: 'text' })
  reason!: string;

  @Column({ name: 'correlation_id', type: 'varchar', length: 128 })
  correlationId!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
