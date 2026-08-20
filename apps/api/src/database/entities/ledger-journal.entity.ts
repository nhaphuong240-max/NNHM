import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'ledger_journals' })
export class LedgerJournalEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Index({ unique: true })
  @Column({ name: 'webhook_event_id', type: 'varchar', length: 128 })
  webhookEventId!: string;

  @Column({ name: 'booking_id', type: 'varchar', length: 32 })
  bookingId!: string;

  @Column({ name: 'payment_intent_id', type: 'varchar', length: 32 })
  paymentIntentId!: string;

  @Column({ type: 'varchar', length: 128 })
  reference!: string;

  @CreateDateColumn({ name: 'posted_at', type: 'timestamptz' })
  postedAt!: Date;
}
