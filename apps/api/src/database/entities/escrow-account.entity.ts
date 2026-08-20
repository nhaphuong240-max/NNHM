import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EscrowMilestoneEntity } from './escrow-milestone.entity';

@Entity({ name: 'escrow_accounts' })
export class EscrowAccountEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'bookingId'])
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'booking_id', type: 'varchar', length: 32 })
  bookingId!: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2 })
  totalAmount!: string;

  @Column({ name: 'held_amount', type: 'numeric', precision: 14, scale: 2 })
  heldAmount!: string;

  @Column({ name: 'released_amount', type: 'numeric', precision: 14, scale: 2, default: '0' })
  releasedAmount!: string;

  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' })
  status!: 'ACTIVE' | 'COMPLETED';

  @Column({ name: 'regulatory_scope', type: 'varchar', length: 32, default: 'ESCROW_NHNN' })
  regulatoryScope!: string;

  @OneToMany(() => EscrowMilestoneEntity, (m) => m.account, { cascade: true })
  milestones!: EscrowMilestoneEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
