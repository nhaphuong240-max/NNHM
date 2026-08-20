import type {
  ReconciliationDiscrepancy,
  ReconciliationReportEntity,
  ReconciliationStatus,
} from '../../database/entities/reconciliation-report.entity';

export interface ReconciliationRecord {
  date: string;
  attributes: {
    status: ReconciliationStatus;
    gatewayTotal: number;
    ledgerTotal: number;
    gatewayCount: number;
    ledgerCount: number;
    discrepancies: ReconciliationDiscrepancy[];
    ranAt: string;
  };
}

export interface GetReconciliationQuery {
  tenantId: string;
  date?: string;
  days?: number;
}

export interface GetReconciliationResult {
  data: ReconciliationRecord | ReconciliationRecord[];
  meta: {
    tenantId: string;
    matchRate?: number;
    matchedDays?: number;
    totalDays?: number;
    source: 'postgres';
  };
}

export function mapReconciliationReport(row: ReconciliationReportEntity): ReconciliationRecord {
  return {
    date: row.reportDate,
    attributes: {
      status: row.status,
      gatewayTotal: Number(row.gatewayTotal),
      ledgerTotal: Number(row.ledgerTotal),
      gatewayCount: row.gatewayCount,
      ledgerCount: row.ledgerCount,
      discrepancies: row.discrepancies ?? [],
      ranAt: row.ranAt.toISOString(),
    },
  };
}
