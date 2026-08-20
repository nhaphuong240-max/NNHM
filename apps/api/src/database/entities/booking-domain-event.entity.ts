import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type BookingEventCategory = 'state' | 'payment' | 'system';

@Entity({ name: 'booking_domain_events' })
@Index(['tenantId', 'bookingId', 'occurredAt'])
export class BookingDomainEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'booking_id', type: 'varchar', length: 32 })
  bookingId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType!: string;

  @Column({ type: 'varchar', length: 16 })
  category!: BookingEventCategory;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ name: 'actor_id', type: 'varchar', length: 32, nullable: true })
  actorId!: string | null;

  @Column({ name: 'correlation_id', type: 'varchar', length: 64, nullable: true })
  correlationId!: string | null;

  @CreateDateColumn({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;
}
