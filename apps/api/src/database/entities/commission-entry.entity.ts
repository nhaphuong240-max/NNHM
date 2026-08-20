import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type CommissionSplitRole = 'PRIMARY' | 'CO_BROKER' | 'AGENCY';
export type CommissionPayoutStatus = 'PENDING' | 'HOLDBACK' | 'APPROVED' | 'PAID';

@Entity({ name: 'commission_entries' })
export class CommissionEntryEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Index(['snapshotId'])
  @Column({ name: 'snapshot_id', type: 'varchar', length: 32 })
  snapshotId!: string;

  @Column({ name: 'recipient_type', type: 'varchar', length: 16 })
  recipientType!: string;

  @Column({ name: 'recipient_id', type: 'varchar', length: 32 })
  recipientId!: string;

  @Column({ type: 'varchar', length: 16 })
  role!: CommissionSplitRole;

  @Column({ name: 'split_percent', type: 'numeric', precision: 6, scale: 3 })
  splitPercent!: string;

  @Column({ type: 'bigint' })
  amount!: string;

  @Column({ name: 'payout_status', type: 'varchar', length: 16, default: 'PENDING' })
  payoutStatus!: CommissionPayoutStatus;

  @Index(['settlementRunId'])
  @Column({ name: 'settlement_run_id', type: 'varchar', length: 32, nullable: true })
  settlementRunId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
