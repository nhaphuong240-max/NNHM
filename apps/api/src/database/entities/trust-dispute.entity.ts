import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type TrustDisputeStatus = 'OPEN' | 'IN_MEDIATION' | 'RESOLVED';
export type TrustDisputeType = 'PAYMENT' | 'BOOKING' | 'COMMISSION' | 'OTHER';

@Entity({ name: 'trust_disputes' })
export class TrustDisputeEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'booking_id', type: 'varchar', length: 32, nullable: true })
  bookingId!: string | null;

  @Column({ type: 'varchar', length: 24 })
  type!: TrustDisputeType;

  @Column({ type: 'varchar', length: 24 })
  status!: TrustDisputeStatus;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  evidence!: Record<string, unknown>[];

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote!: string | null;

  @Column({ name: 'opened_by', type: 'varchar', length: 32, nullable: true })
  openedBy!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
