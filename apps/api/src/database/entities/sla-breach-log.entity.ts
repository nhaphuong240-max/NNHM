import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'sla_breach_logs' })
export class SlaBreachLogEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'lead_id', type: 'varchar', length: 32 })
  leadId!: string;

  @Column({ name: 'breach_type', type: 'varchar', length: 32 })
  breachType!: 'HOT_FIRST_TOUCH' | 'HOT_ESCALATED';

  @Column({ name: 'due_at', type: 'timestamptz' })
  dueAt!: Date;

  @Column({ name: 'breached_at', type: 'timestamptz' })
  breachedAt!: Date;

  @Column({ name: 'escalated_to', type: 'varchar', length: 32, nullable: true })
  escalatedTo!: string | null;

  @Column({ name: 'actor_id', type: 'varchar', length: 32, nullable: true })
  actorId!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
