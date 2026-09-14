import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type { DealDisputeStatus } from './deal-dispute.entity';

@Entity({ name: 'deal_dispute_events' })
export class DealDisputeEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'dispute_id', type: 'varchar', length: 32 })
  disputeId!: string;

  @Column({ name: 'from_status', type: 'varchar', length: 24, nullable: true })
  fromStatus!: DealDisputeStatus | null;

  @Column({ name: 'to_status', type: 'varchar', length: 24 })
  toStatus!: DealDisputeStatus;

  @Column({ name: 'actor_id', type: 'varchar', length: 32, nullable: true })
  actorId!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
