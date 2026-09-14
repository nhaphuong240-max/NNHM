import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CrmRoutingRulesPayload = {
  enabled: boolean;
  hotTierMinScore: number;
  strategy: 'HOT_ROUND_ROBIN' | 'PARTNER_SCORE_AGING';
  assignOnTier: 'HOT';
  maxOpenLeads?: number;
  skillTags?: string[];
  roundRobinCursor?: number;
  /** P2 FR-REV-002 — human must approve before auto-assign */
  requireHumanApproval?: boolean;
};

@Entity({ name: 'crm_routing_rules' })
export class CrmRoutingRuleEntity {
  @PrimaryColumn({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @PrimaryColumn({ name: 'project_id', type: 'varchar', length: 32, default: '' })
  projectId!: string;

  @Column({ type: 'jsonb' })
  rules!: CrmRoutingRulesPayload;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ name: 'updated_by', type: 'varchar', length: 32, nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
