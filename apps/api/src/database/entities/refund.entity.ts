import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type RefundStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

@Entity({ name: 'refunds' })
export class RefundEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'booking_id', type: 'varchar', length: 32 })
  bookingId!: string;

  @Column({ name: 'payment_intent_id', type: 'varchar', length: 32 })
  paymentIntentId!: string;

  @Column({ type: 'bigint' })
  amount!: string;

  @Column({ type: 'varchar', length: 8, default: 'VND' })
  currency!: string;

  @Column({ type: 'varchar', length: 16 })
  status!: RefundStatus;

  @Column({ name: 'gateway_ref', type: 'varchar', length: 128, nullable: true })
  gatewayRef!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Index(['tenantId', 'idempotencyKey'], { unique: true })
  @Column({ name: 'idempotency_key', type: 'varchar', length: 128, nullable: true })
  idempotencyKey!: string | null;

  @Column({ name: 'ledger_entry_id', type: 'varchar', length: 32, nullable: true })
  ledgerEntryId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
