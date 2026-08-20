import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'agent_wau_daily' })
export class AgentWauDailyEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'reportDate'], { unique: true })
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'report_date', type: 'date' })
  reportDate!: string;

  @Column({ type: 'int', default: 0 })
  wau!: number;

  @Column({ type: 'int', default: 0 })
  dau!: number;

  @Column({ name: 'mobile_share', type: 'numeric', precision: 5, scale: 4, default: '0' })
  mobileShare!: string;

  @Column({ name: 'unique_agents', type: 'jsonb', default: '[]' })
  uniqueAgents!: string[];
}
