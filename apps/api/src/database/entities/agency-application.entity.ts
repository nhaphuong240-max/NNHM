import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AgencyApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity({ name: 'agency_applications' })
export class AgencyApplicationEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'developer_tenant_id', type: 'varchar', length: 32 })
  developerTenantId!: string;

  @Column({ name: 'agency_tenant_id', type: 'varchar', length: 32 })
  agencyTenantId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 32 })
  projectId!: string;

  @Column({ name: 'distribution_policy_id', type: 'varchar', length: 32 })
  distributionPolicyId!: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: AgencyApplicationStatus;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes!: string | null;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 32, nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Index(['agencyTenantId', 'projectId', 'distributionPolicyId'], { unique: true })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
