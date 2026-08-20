import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type CrmActivityType = 'CALL' | 'NOTE' | 'VISIT' | 'ZALO' | 'MEETING';

@Entity({ name: 'crm_activities' })
export class CrmActivityEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Index(['tenantId', 'leadId'])
  @Column({ name: 'lead_id', type: 'varchar', length: 32 })
  leadId!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: CrmActivityType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  summary!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: 'created_by', type: 'varchar', length: 32, nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
