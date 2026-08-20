import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'data_product_entitlements' })
export class DataProductEntitlementEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'productCode'], { unique: true })
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'product_code', type: 'varchar', length: 32 })
  productCode!: 'HEATMAP' | 'PRICING_REPORT' | 'MARKET_BRIEF';

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ name: 'quota_per_month', type: 'int', default: 100 })
  quotaPerMonth!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
