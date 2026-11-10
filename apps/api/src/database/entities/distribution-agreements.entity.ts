import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'distribution_agreements' })
@Index(['tenantId', 'projectId', 'partnerOrgId', 'stockOwnerTenantId'], { unique: true })
export class DistributionAgreementEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 128 })
  projectId!: string;

  @Column({ name: 'partner_org_id', type: 'varchar', length: 128 })
  partnerOrgId!: string;

  @Column({ name: 'stock_owner_tenant_id', type: 'varchar', length: 128 })
  stockOwnerTenantId!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
