import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AnchorPilotClass = 'SYNTHETIC' | 'LIVE';
export type AnchorOnboardingStatus = 'DRAFT' | 'ACTIVE' | 'SIGNED';

@Entity({ name: 'anchor_tenant_profiles' })
@Index(['tenantId'], { unique: true })
export class AnchorTenantProfileEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 16, default: 'ANCHOR' })
  tier!: 'ANCHOR' | 'STANDARD';

  @Column({ name: 'project_ids', type: 'jsonb', default: '[]' })
  projectIds!: string[];

  @Column({ name: 'sla_pack_version', type: 'varchar', length: 32, default: '2026-T5-v1' })
  slaPackVersion!: string;

  @Column({ name: 'trust_score_min', type: 'int', default: 80 })
  trustScoreMin!: number;

  @Column({ name: 'display_name', type: 'varchar', length: 128 })
  displayName!: string;

  @Column({ name: 'legal_name', type: 'varchar', length: 256, nullable: true })
  legalName!: string | null;

  @Column({ name: 'pilot_class', type: 'varchar', length: 16, default: 'SYNTHETIC' })
  pilotClass!: AnchorPilotClass;

  @Column({ name: 'onboarding_status', type: 'varchar', length: 16, default: 'ACTIVE' })
  onboardingStatus!: AnchorOnboardingStatus;

  @Column({ name: 'onboarded_at', type: 'timestamptz', nullable: true })
  onboardedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
