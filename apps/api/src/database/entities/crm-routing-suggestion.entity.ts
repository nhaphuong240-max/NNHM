import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type RoutingSuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity({ name: 'crm_routing_suggestions' })
export class CrmRoutingSuggestionEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'status'])
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'lead_id', type: 'varchar', length: 32 })
  leadId!: string;

  @Column({ name: 'suggested_agent_id', type: 'varchar', length: 32 })
  suggestedAgentId!: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: RoutingSuggestionStatus;

  @Column({ type: 'jsonb', default: {} })
  reason!: Record<string, unknown>;

  @Column({ name: 'partner_score', type: 'int', nullable: true })
  partnerScore!: number | null;

  @Column({ name: 'inventory_aging_days', type: 'int', nullable: true })
  inventoryAgingDays!: number | null;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 32, nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
