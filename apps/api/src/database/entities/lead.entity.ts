import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type LeadTier = 'HOT' | 'WARM' | 'NEW';
/** UC-CRM-03 pipeline kanban stages (stored in `status`) */
export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'VIEWING'
  | 'NEGOTIATING'
  | 'BOOKING'
  | 'WON'
  | 'LOST';
export type LeadRoutingStatus = 'PENDING' | 'ASSIGNED' | 'CLOSED';
export type LeadScoreStatus = 'PENDING' | 'SCORED' | 'UNSCORED';

@Entity({ name: 'leads' })
export class LeadEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 128 })
  fullName!: string;

  @Column({ type: 'varchar', length: 32 })
  phone!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 32 })
  source!: string;

  @Column({ type: 'int', default: 0 })
  score!: number;

  @Column({ type: 'varchar', length: 8 })
  tier!: LeadTier;

  @Column({ type: 'varchar', length: 16, default: 'NEW' })
  status!: LeadStatus;

  @Column({ name: 'routing_status', type: 'varchar', length: 16, default: 'PENDING' })
  routingStatus!: LeadRoutingStatus;

  @Column({ name: 'score_status', type: 'varchar', length: 16, default: 'PENDING' })
  scoreStatus!: LeadScoreStatus;

  @Column({ name: 'assigned_to', type: 'varchar', length: 32, nullable: true })
  assignedTo!: string | null;

  @Column({ name: 'scoring_meta', type: 'jsonb', nullable: true })
  scoringMeta!: Record<string, unknown> | null;

  @Column({ name: 'channel_meta', type: 'jsonb', nullable: true })
  channelMeta!: Record<string, unknown> | null;

  @Column({ name: 'unit_id', type: 'varchar', length: 32, nullable: true })
  unitId!: string | null;

  @Column({ name: 'listing_id', type: 'varchar', length: 32, nullable: true })
  listingId!: string | null;

  @Column({ name: 'project_id', type: 'varchar', length: 32, nullable: true })
  projectId!: string | null;

  @Column({ name: 'inquiry_type', type: 'varchar', length: 16, nullable: true })
  inquiryType!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  requirement!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Index(['tenantId', 'idempotencyKey'], { unique: true })
  @Column({ name: 'idempotency_key', type: 'varchar', length: 128, nullable: true })
  idempotencyKey!: string | null;

  @Column({ name: 'consent_given', type: 'boolean', default: false })
  consentGiven!: boolean;

  @Column({ name: 'consent_at', type: 'timestamptz', nullable: true })
  consentAt!: Date | null;

  @Column({ name: 'privacy_policy_version', type: 'varchar', length: 32, nullable: true })
  privacyPolicyVersion!: string | null;

  @Column({ name: 'marketing_consent', type: 'boolean', default: false })
  marketingConsent!: boolean;

  /** UC-AN-04 — marketing UTM campaign tag (indexed for attribution) */
  @Index(['tenantId', 'utmCampaign'])
  @Column({ name: 'utm_campaign', type: 'varchar', length: 128, nullable: true })
  utmCampaign!: string | null;

  /** UC-AN-04 — platform campaign id (Meta/Zalo/Ads) */
  @Index(['tenantId', 'campaignId'])
  @Column({ name: 'campaign_id', type: 'varchar', length: 128, nullable: true })
  campaignId!: string | null;

  @Column({ name: 'lost_reason', type: 'varchar', length: 64, nullable: true })
  lostReason!: string | null;

  @Column({ name: 'last_activity_at', type: 'timestamptz', nullable: true })
  lastActivityAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
