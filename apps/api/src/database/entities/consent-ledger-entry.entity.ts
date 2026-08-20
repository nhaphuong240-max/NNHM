import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type ConsentSubjectType = 'LEAD' | 'USER' | 'BOOKING' | 'CONTRACT';
export type ConsentPurpose =
  | 'PRIVACY'
  | 'MARKETING'
  | 'ESIGN'
  | 'DATA_PROCESSING';

@Entity({ name: 'consent_ledger_entries' })
@Index(['tenantId', 'subjectType', 'subjectId'])
@Index(['tenantId', 'recordedAt'])
export class ConsentLedgerEntryEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'subject_type', type: 'varchar', length: 16 })
  subjectType!: ConsentSubjectType;

  @Column({ name: 'subject_id', type: 'varchar', length: 64 })
  subjectId!: string;

  @Column({ type: 'varchar', length: 24 })
  purpose!: ConsentPurpose;

  @Column({ name: 'policy_version', type: 'varchar', length: 32 })
  policyVersion!: string;

  @Column({ type: 'boolean' })
  granted!: boolean;

  @Column({ type: 'varchar', length: 32, nullable: true })
  channel!: string | null;

  @Column({ name: 'ip_hash', type: 'varchar', length: 64, nullable: true })
  ipHash!: string | null;

  @Column({ name: 'actor_id', type: 'varchar', length: 32, nullable: true })
  actorId!: string | null;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt!: Date;
}
