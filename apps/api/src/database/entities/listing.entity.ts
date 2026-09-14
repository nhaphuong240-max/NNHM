import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UnitEntity } from './unit.entity';

export type ListingStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
export type AntiDriftStatus = 'PASS' | 'FLAG' | 'BLOCK';
export type ListingTransactionType = 'sale' | 'rent' | 'project';

@Entity({ name: 'listings' })
export class ListingEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'unit_id', type: 'varchar', length: 32 })
  unitId!: string;

  /** GR optimistic-lock version pinned at listing commit (T7-S4). */
  @Column({ name: 'unit_version', type: 'int', default: 1 })
  unitVersion!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  highlights!: string[];

  @Column({ name: 'media_ids', type: 'jsonb', default: () => "'[]'" })
  mediaIds!: string[];

  @Column({ name: 'price_display', type: 'bigint', nullable: true })
  priceDisplay!: string | null;

  @Column({ type: 'varchar', length: 24 })
  status!: ListingStatus;

  @Column({ name: 'anti_drift_status', type: 'varchar', length: 8 })
  antiDriftStatus!: AntiDriftStatus;

  @Column({ name: 'drift_report', type: 'jsonb', nullable: true })
  driftReport!: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  verified!: boolean;

  /** P0 FR-SRCH-006 — sale / rent / project for index tab filter */
  @Column({ name: 'transaction_type', type: 'varchar', length: 16, default: 'sale' })
  transactionType!: ListingTransactionType;

  /** P0 FR-SRCH-009 — stale listing auto-pause timestamp */
  @Column({ name: 'freshness_paused_at', type: 'timestamptz', nullable: true })
  freshnessPausedAt!: Date | null;

  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => UnitEntity)
  @JoinColumn({ name: 'unit_id' })
  unit?: UnitEntity;
}
