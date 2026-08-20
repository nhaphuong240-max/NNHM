import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type PaymentIntentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
export type PaymentMethod = 'VNPAY' | 'MOCK';

@Entity({ name: 'payment_intents' })
export class PaymentIntentEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'booking_id', type: 'varchar', length: 32 })
  bookingId!: string;

  @Column({ type: 'bigint' })
  amount!: string;

  @Column({ type: 'varchar', length: 8, default: 'VND' })
  currency!: string;

  @Column({ type: 'varchar', length: 16 })
  method!: PaymentMethod;

  @Column({ type: 'varchar', length: 16 })
  status!: PaymentIntentStatus;

  @Column({ name: 'payment_url', type: 'text' })
  paymentUrl!: string;

  @Column({ name: 'gateway_ref', type: 'varchar', length: 128, nullable: true })
  gatewayRef!: string | null;

  @Index(['tenantId', 'idempotencyKey'], { unique: true })
  @Column({ name: 'idempotency_key', type: 'varchar', length: 128, nullable: true })
  idempotencyKey!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
