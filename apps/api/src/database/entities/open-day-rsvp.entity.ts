import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'open_day_rsvps' })
export class OpenDayRsvpEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'event_id', type: 'varchar', length: 32 })
  eventId!: string;

  @Column({ name: 'lead_id', type: 'varchar', length: 32, nullable: true })
  leadId!: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 128 })
  fullName!: string;

  @Column({ type: 'varchar', length: 32 })
  phone!: string;

  @Column({ name: 'qr_token', type: 'varchar', length: 64, unique: true })
  qrToken!: string;

  @Column({ name: 'checked_in_at', type: 'timestamptz', nullable: true })
  checkedInAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
