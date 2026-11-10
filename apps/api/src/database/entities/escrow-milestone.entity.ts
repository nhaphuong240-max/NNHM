import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { EscrowAccountEntity } from './escrow-account.entity';

@Entity({ name: 'escrow_milestones' })
@Index(['tenantId', 'accountId'])
export class EscrowMilestoneEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'account_id', type: 'varchar', length: 32 })
  accountId!: string;

  @ManyToOne(() => EscrowAccountEntity, (a) => a.milestones, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account!: EscrowAccountEntity;

  @Column({ type: 'varchar', length: 64 })
  label!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 128 })
  condition!: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: 'PENDING' | 'MET' | 'RELEASED';

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt!: Date | null;
}
