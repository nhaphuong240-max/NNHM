import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'audit_events' })
export class AuditEventEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 64 })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 64 })
  entityId!: string;

  @Column({ type: 'varchar', length: 32 })
  action!: string;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ name: 'actor_id', type: 'varchar', length: 32, nullable: true })
  actorId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
