import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type TenantConfigDomain =
  | 'SSO_PROVIDER'
  | 'PAYMENT_GATEWAY'
  | 'WEBHOOK'
  | 'SETTLEMENT_SCHEDULE'
  | 'LIVE_RAILS';

@Entity({ name: 'tenant_config_versions' })
@Index(['tenantId', 'domain', 'entityId', 'version'], { unique: true })
export class TenantConfigVersionEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 32 })
  domain!: TenantConfigDomain;

  @Column({ name: 'entity_id', type: 'varchar', length: 64 })
  entityId!: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ name: 'effective_at', type: 'timestamptz' })
  effectiveAt!: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 32, nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
