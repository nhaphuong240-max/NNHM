import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'data_mart_daily' })
export class DataMartDailyEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'reportDate', 'projectId'], { unique: true })
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 32, nullable: true })
  projectId!: string | null;

  @Column({ name: 'report_date', type: 'date' })
  reportDate!: string;

  @Column({ name: 'absorption_rate', type: 'numeric', precision: 6, scale: 4, default: '0' })
  absorptionRate!: string;

  @Column({ name: 'avg_price_band', type: 'varchar', length: 32, nullable: true })
  avgPriceBand!: string | null;

  @Column({ name: 'velocity_units', type: 'int', default: 0 })
  velocityUnits!: number;

  @Column({ type: 'jsonb', default: '{}' })
  heatmap!: Record<string, unknown>;
}
