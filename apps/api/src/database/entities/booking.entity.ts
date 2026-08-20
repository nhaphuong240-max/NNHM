import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type BookingStatus = 'RESERVED' | 'DEPOSITED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';

@Entity({ name: 'bookings' })
export class BookingEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'unit_id', type: 'varchar', length: 32 })
  unitId!: string;

  /** GR optimistic-lock version pinned at booking commit (T7-S4). */
  @Column({ name: 'unit_version', type: 'int', default: 1 })
  unitVersion!: number;

  @Column({ name: 'lead_id', type: 'varchar', length: 32, nullable: true })
  leadId!: string | null;

  @Column({ type: 'varchar', length: 16 })
  status!: BookingStatus;

  @Column({ name: 'lock_id', type: 'varchar', length: 64 })
  lockId!: string;

  @Column({ name: 'lock_token', type: 'varchar', length: 64 })
  lockToken!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'deposit_amount', type: 'bigint', nullable: true })
  depositAmount!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Index(['tenantId', 'idempotencyKey'], { unique: true })
  @Column({ name: 'idempotency_key', type: 'varchar', length: 128, nullable: true })
  idempotencyKey!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
