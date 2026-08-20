import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CommissionPolicyStatus = 'DRAFT' | 'PUBLISHED';
export type CommissionBaseType = 'DEPOSIT' | 'SALE_PRICE';

export interface CommissionSplitRuleRow {
  role: 'PRIMARY' | 'CO_BROKER' | 'AGENCY';
  recipientId: string;
  percent: number;
}

@Entity({ name: 'commission_policies' })
export class CommissionPolicyEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 32 })
  projectId!: string;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'varchar', length: 16 })
  status!: CommissionPolicyStatus;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ name: 'rate_percent', type: 'numeric', precision: 6, scale: 3 })
  ratePercent!: string;

  @Column({ name: 'base_type', type: 'varchar', length: 16, default: 'DEPOSIT' })
  baseType!: CommissionBaseType;

  @Column({ name: 'split_rules', type: 'jsonb' })
  splitRules!: CommissionSplitRuleRow[];

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom!: string | null;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo!: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Index(['tenantId', 'projectId', 'version'], { unique: true })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
