import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type LedgerSide = 'DEBIT' | 'CREDIT';

@Entity({ name: 'ledger_entries' })
export class LedgerEntryEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index()
  @Column({ name: 'journal_id', type: 'varchar', length: 32 })
  journalId!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 32 })
  account!: string;

  @Column({ type: 'varchar', length: 8 })
  side!: LedgerSide;

  @Column({ type: 'bigint' })
  amount!: string;

  @Column({ type: 'varchar', length: 8, default: 'VND' })
  currency!: string;

  @Column({ name: 'reference_type', type: 'varchar', length: 32 })
  referenceType!: string;

  @Column({ name: 'reference_id', type: 'varchar', length: 32 })
  referenceId!: string;

  @CreateDateColumn({ name: 'posted_at', type: 'timestamptz' })
  postedAt!: Date;
}
