import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { CustomerEntity } from './customers.entity';
import { LeadEntity } from './lead.entity';

@Entity({ name: 'dedup_reviews' })
@Index(['tenantId', 'customerId', 'leadId'], { unique: true })
export class DedupReviewEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 32 })
  customerId!: string;

  @ManyToOne(() => CustomerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerEntity;

  @Column({ name: 'lead_id', type: 'varchar', length: 32 })
  leadId!: string;

  @ManyToOne(() => LeadEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'lead_id' })
  lead?: LeadEntity;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
