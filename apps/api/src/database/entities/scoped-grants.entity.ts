import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProjectEntity } from './project.entity';

@Entity({ name: 'scoped_grants' })
@Index(['tenantId', 'granteeOrgId', 'projectId', 'action', 'resource'], {
  unique: true,
  where: "((status)::text = 'ACTIVE'::text)",
})
export class ScopedGrantEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'grantee_org_id', type: 'varchar', length: 128 })
  granteeOrgId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 32 })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  @Column({ name: 'action', type: 'varchar', length: 64 })
  action!: string;

  @Column({ name: 'resource', type: 'varchar', length: 64 })
  resource!: string;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
