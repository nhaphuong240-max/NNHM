import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ViewingStatus = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELED';
export type ViewingOutcome =
  | 'COMPLETED_INTERESTED'
  | 'COMPLETED_NEEDS_OPTIONS'
  | 'PRICE_OBJECTION'
  | 'FINANCE_OBJECTION'
  | 'LEGAL_CONCERN'
  | 'NOT_SUITABLE'
  | 'NO_SHOW_CUSTOMER'
  | 'NO_SHOW_AGENT'
  | 'CANCELED';

@Entity({ name: 'crm_viewings' })
export class ViewingEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Index(['tenantId', 'leadId'])
  @Column({ name: 'lead_id', type: 'varchar', length: 32 })
  leadId!: string;

  @Column({ name: 'unit_id', type: 'varchar', length: 32, nullable: true })
  unitId!: string | null;

  @Column({ name: 'project_id', type: 'varchar', length: 32, nullable: true })
  projectId!: string | null;

  @Column({ name: 'listing_id', type: 'varchar', length: 32, nullable: true })
  listingId!: string | null;

  @Column({ name: 'requested_slot', type: 'timestamptz', nullable: true })
  requestedSlot!: Date | null;

  @Column({ type: 'varchar', length: 16, default: 'CALLBACK' })
  mode!: 'TIMESLOT' | 'CALLBACK';

  @Column({ type: 'varchar', length: 16, default: 'REQUESTED' })
  status!: ViewingStatus;

  @Column({ type: 'varchar', length: 32, nullable: true })
  outcome!: ViewingOutcome | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'assigned_to', type: 'varchar', length: 32, nullable: true })
  assignedTo!: string | null;

  @Column({ name: 'reminder_sent_at', type: 'timestamptz', nullable: true })
  reminderSentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
