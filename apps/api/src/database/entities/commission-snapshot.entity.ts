import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type CommissionSnapshotStatus = 'CALCULATED' | 'HOLDBACK' | 'RELEASED' | 'PAID';

@Entity({ name: 'commission_snapshots' })
export class CommissionSnapshotEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Index(['tenantId', 'bookingId'], { unique: true })
  @Column({ name: 'booking_id', type: 'varchar', length: 32 })
  bookingId!: string;

  @Column({ name: 'policy_id', type: 'varchar', length: 32 })
  policyId!: string;

  @Column({ name: 'policy_version', type: 'int' })
  policyVersion!: number;

  @Column({ name: 'policy_hash', type: 'varchar', length: 64 })
  policyHash!: string;

  @Column({ name: 'deal_amount', type: 'bigint' })
  dealAmount!: string;

  @Column({ name: 'total_commission', type: 'bigint' })
  totalCommission!: string;

  @Column({ type: 'varchar', length: 16 })
  status!: CommissionSnapshotStatus;

  @CreateDateColumn({ name: 'calculated_at', type: 'timestamptz' })
  calculatedAt!: Date;
}
