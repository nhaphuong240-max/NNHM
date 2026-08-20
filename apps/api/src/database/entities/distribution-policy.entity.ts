import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DistributionPolicyStatus = 'DRAFT' | 'PUBLISHED';

export interface DistributionTermsRow {
  regions?: string[];
  commissionTier?: string;
  maxAgencies?: number;
  summary?: string;
  crossAnchorProjectIds?: string[];
}

@Entity({ name: 'distribution_policies' })
export class DistributionPolicyEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 32 })
  projectId!: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'varchar', length: 16 })
  status!: DistributionPolicyStatus;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'jsonb', default: {} })
  terms!: DistributionTermsRow;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Index(['tenantId', 'projectId', 'version'], { unique: true })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
