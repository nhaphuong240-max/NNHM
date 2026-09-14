import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DealDisputeStatus =
  | 'OPEN'
  | 'EVIDENCE'
  | 'REVIEW'
  | 'SPLIT'
  | 'FAVOR_A'
  | 'FAVOR_B'
  | 'APPEAL'
  | 'CLOSED';

@Entity({ name: 'deal_disputes' })
export class DealDisputeEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'status'])
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'registration_id', type: 'varchar', length: 32 })
  registrationId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 32 })
  projectId!: string;

  @Column({ type: 'varchar', length: 24, default: 'OPEN' })
  status!: DealDisputeStatus;

  @Column({ name: 'opened_by_org_id', type: 'varchar', length: 32 })
  openedByOrgId!: string;

  @Column({ name: 'opened_by_user_id', type: 'varchar', length: 32 })
  openedByUserId!: string;

  @Column({ name: 'defending_org_id', type: 'varchar', length: 32, nullable: true })
  defendingOrgId!: string | null;

  @Column({ name: 'pii_safe_summary', type: 'text', default: '' })
  piiSafeSummary!: string;

  @Column({ name: 'attribution_key', type: 'varchar', length: 64, nullable: true })
  attributionKey!: string | null;

  @Column({ name: 'sla_due_at', type: 'timestamptz', nullable: true })
  slaDueAt!: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
