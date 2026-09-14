import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { TenantDemandPolicyPayload } from '../../modules/crm/demand-policy.types';

@Entity({ name: 'tenant_demand_policies' })
export class TenantDemandPolicyEntity {
  @PrimaryColumn({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'jsonb' })
  payload!: TenantDemandPolicyPayload;

  @Column({ name: 'updated_by', type: 'varchar', length: 32, nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
