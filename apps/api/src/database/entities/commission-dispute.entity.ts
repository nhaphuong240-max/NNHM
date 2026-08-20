import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type CommissionDisputeStatus = 'OPEN' | 'RESOLVED';

@Entity({ name: 'commission_disputes' })
export class CommissionDisputeEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Index(['snapshotId'])
  @Column({ name: 'snapshot_id', type: 'varchar', length: 32 })
  snapshotId!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'varchar', length: 16 })
  status!: CommissionDisputeStatus;

  @Column({ name: 'holdback_percent', type: 'numeric', precision: 6, scale: 3, default: 100 })
  holdbackPercent!: string;

  @CreateDateColumn({ name: 'opened_at', type: 'timestamptz' })
  openedAt!: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;
}
