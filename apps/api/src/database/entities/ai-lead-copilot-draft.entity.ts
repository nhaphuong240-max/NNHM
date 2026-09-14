import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export type CopilotDraftStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity({ name: 'ai_lead_copilot_drafts' })
export class AiLeadCopilotDraftEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'leadId'])
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'lead_id', type: 'varchar', length: 32 })
  leadId!: string;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ name: 'next_actions', type: 'jsonb', default: [] })
  nextActions!: string[];

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: CopilotDraftStatus;

  @Column({ name: 'requires_approval', type: 'boolean', default: true })
  requiresApproval!: boolean;

  @Column({ name: 'model_version', type: 'varchar', length: 32 })
  modelVersion!: string;

  @Column({ name: 'approved_by', type: 'varchar', length: 32, nullable: true })
  approvedBy!: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'created_by', type: 'varchar', length: 32, nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
