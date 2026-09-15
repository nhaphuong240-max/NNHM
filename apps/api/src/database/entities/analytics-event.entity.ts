import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export type AnalyticsEventName =
  | 'search_submitted'
  | 'filter_applied'
  | 'property_viewed'
  | 'unit_viewed'
  | 'saved'
  | 'contact_started'
  | 'lead_created'
  | 'viewing_requested'
  | 'share_link_opened';

@Entity({ name: 'analytics_events' })
export class AnalyticsEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'name'])
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 64 })
  name!: AnalyticsEventName;

  @Column({ type: 'varchar', length: 32 })
  source!: string;

  @Column({ name: 'consent_basis', type: 'varchar', length: 32, default: 'legitimate_interest' })
  consentBasis!: string;

  @Column({ name: 'session_id', type: 'varchar', length: 64, nullable: true })
  sessionId!: string | null;

  @Column({ name: 'visitor_id', type: 'varchar', length: 64, nullable: true })
  visitorId!: string | null;

  @Column({ name: 'user_id', type: 'varchar', length: 32, nullable: true })
  userId!: string | null;

  @Column({ name: 'entity_type', type: 'varchar', length: 32, nullable: true })
  entityType!: string | null;

  @Column({ name: 'entity_id', type: 'varchar', length: 32, nullable: true })
  entityId!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
