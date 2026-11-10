import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export type LeadConversionEventType =
  | 'HOT_ROUTED'
  | 'CONTACTED'
  | 'BOOKED'
  | 'DEPOSITED';

@Entity({ name: 'lead_conversion_events' })
@Index(['tenantId', 'leadId'])
@Index(['tenantId', 'eventType'])
export class LeadConversionEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'lead_id', type: 'varchar', length: 32 })
  leadId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 16 })
  eventType!: LeadConversionEventType;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
