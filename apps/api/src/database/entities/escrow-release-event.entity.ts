import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'escrow_release_events' })
export class EscrowReleaseEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'accountId'])
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'account_id', type: 'varchar', length: 32 })
  accountId!: string;

  @Column({ name: 'milestone_id', type: 'varchar', length: 32 })
  milestoneId!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: string;

  @Column({ name: 'approved_by_finance', type: 'boolean', default: false })
  approvedByFinance!: boolean;

  @Column({ name: 'approved_by_compliance', type: 'boolean', default: false })
  approvedByCompliance!: boolean;

  @Column({ name: 'bank_webhook_confirmed', type: 'boolean', default: false })
  bankWebhookConfirmed!: boolean;

  @Column({ name: 'ledger_journal_id', type: 'varchar', length: 32, nullable: true })
  ledgerJournalId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
