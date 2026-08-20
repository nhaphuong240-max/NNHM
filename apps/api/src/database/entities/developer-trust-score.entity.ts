import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DeveloperTrustFactors = {
  driftBlockRate: number;
  verifiedListingPct: number;
  auditCompleteness: number;
  timeTravelCoverage: number;
};

@Entity({ name: 'developer_trust_scores' })
@Index(['tenantId', 'projectId'], { unique: true })
export class DeveloperTrustScoreEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 32 })
  projectId!: string;

  @Column({ type: 'int' })
  score!: number;

  @Column({ type: 'jsonb' })
  factors!: DeveloperTrustFactors;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
