import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type WebhookEventStatus = 'PROCESSING' | 'PROCESSED' | 'FAILED';

@Entity({ name: 'payment_webhook_events' })
export class PaymentWebhookEventEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'event_id', type: 'varchar', length: 128 })
  eventId!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 32 })
  eventType!: string;

  @Column({ name: 'transaction_id', type: 'varchar', length: 128 })
  transactionId!: string;

  @Column({ name: 'payment_intent_id', type: 'varchar', length: 32 })
  paymentIntentId!: string;

  @Column({ type: 'varchar', length: 16 })
  status!: WebhookEventStatus;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ name: 'result', type: 'jsonb', nullable: true })
  result!: Record<string, unknown> | null;

  @Column({ name: 'ledger_entry_id', type: 'varchar', length: 32, nullable: true })
  ledgerEntryId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
