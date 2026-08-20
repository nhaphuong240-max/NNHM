import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type SettlementRunStatus = 'PENDING' | 'SUBMITTED' | 'COMPLETED' | 'FAILED';

@Entity({ name: 'commission_settlement_runs' })
export class CommissionSettlementRunEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Index(['tenantId', 'status'])
  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: SettlementRunStatus;

  @Column({ type: 'varchar', length: 128, nullable: true })
  label!: string | null;

  @Column({ name: 'period_from', type: 'date', nullable: true })
  periodFrom!: string | null;

  @Column({ name: 'period_to', type: 'date', nullable: true })
  periodTo!: string | null;

  @Column({ name: 'entry_count', type: 'int', default: 0 })
  entryCount!: number;

  @Column({ name: 'total_amount', type: 'bigint', default: '0' })
  totalAmount!: string;

  @Column({ name: 'created_by', type: 'varchar', length: 32, nullable: true })
  createdBy!: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
