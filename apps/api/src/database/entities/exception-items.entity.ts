import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'exception_items' })
@Index(['tenantId', 'ownerId', 'severity'], { unique: true })
export class ExceptionItemEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'owner_id', type: 'varchar', length: 128 })
  ownerId!: string;

  @Column({ name: 'severity', type: 'varchar', length: 64 })
  severity!: string;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: false })
  dueAt!: Date;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
