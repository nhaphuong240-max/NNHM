import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { TenantEntity } from './tenant.entity';

@Entity({ name: 'distribution_agreements' })
@Index(['tenantId', 'projectId', 'partnerOrgId', 'stockOwnerTenantId'], { unique: true })
export class DistributionAgreementEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 32 })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  @Column({ name: 'partner_org_id', type: 'varchar', length: 128 })
  partnerOrgId!: string;

  @Column({ name: 'stock_owner_tenant_id', type: 'varchar', length: 32 })
  stockOwnerTenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'stock_owner_tenant_id' })
  stockOwner?: TenantEntity;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
