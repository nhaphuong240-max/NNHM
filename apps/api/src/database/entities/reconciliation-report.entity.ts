import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ReconciliationStatus = 'MATCHED' | 'MISMATCH';

export interface ReconciliationDiscrepancy {
  type: 'GATEWAY_ONLY' | 'LEDGER_ONLY' | 'AMOUNT_MISMATCH';
  paymentIntentId?: string;
  journalId?: string;
  gatewayAmount?: number;
  ledgerAmount?: number;
  detail?: string;
}

@Entity({ name: 'reconciliation_reports' })
export class ReconciliationReportEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Index(['tenantId', 'reportDate'], { unique: true })
  @Column({ name: 'report_date', type: 'date' })
  reportDate!: string;

  @Column({ type: 'varchar', length: 16 })
  status!: ReconciliationStatus;

  @Column({ name: 'gateway_total', type: 'bigint' })
  gatewayTotal!: string;

  @Column({ name: 'ledger_total', type: 'bigint' })
  ledgerTotal!: string;

  @Column({ name: 'gateway_count', type: 'int', default: 0 })
  gatewayCount!: number;

  @Column({ name: 'ledger_count', type: 'int', default: 0 })
  ledgerCount!: number;

  @Column({ type: 'jsonb', default: '[]' })
  discrepancies!: ReconciliationDiscrepancy[];

  @CreateDateColumn({ name: 'ran_at', type: 'timestamptz' })
  ranAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
