import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export type AgentActivitySource = 'MOBILE' | 'WEB';

@Entity({ name: 'agent_activity_events' })
export class AgentActivityEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'userId', 'createdAt'])
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 32 })
  userId!: string;

  @Column({ type: 'varchar', length: 16 })
  source!: AgentActivitySource;

  @Column({ name: 'event_type', type: 'varchar', length: 32 })
  eventType!: string;

  @Column({ name: 'session_id', type: 'varchar', length: 64, nullable: true })
  sessionId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
