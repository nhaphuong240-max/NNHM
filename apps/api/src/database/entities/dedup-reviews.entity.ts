import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'dedup_reviews' })
@Index(['tenantId', 'customerId', 'leadId'], { unique: true })
export class DedupReviewEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 128 })
  customerId!: string;

  @Column({ name: 'lead_id', type: 'varchar', length: 128 })
  leadId!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
