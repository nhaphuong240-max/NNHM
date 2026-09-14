import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'attribution_touchpoints' })
export class AttributionTouchpointEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Index(['tenantId', 'leadId'])
  @Column({ name: 'lead_id', type: 'varchar', length: 32 })
  leadId!: string;

  @Column({ type: 'varchar', length: 32 })
  channel!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  source!: string | null;

  @Column({ name: 'campaign_id', type: 'varchar', length: 64, nullable: true })
  campaignId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: 'occurred_at', type: 'timestamptz', default: () => 'now()' })
  occurredAt!: Date;
}
