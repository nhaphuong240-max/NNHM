import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'scoped_grants' })
@Index(['tenantId', 'granteeOrgId', 'projectId', 'action', 'resource'], { unique: true })
export class ScopedGrantEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'grantee_org_id', type: 'varchar', length: 128 })
  granteeOrgId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 128 })
  projectId!: string;

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
