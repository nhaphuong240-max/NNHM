export type AntiDriftStatus = 'PASS' | 'FLAG' | 'BLOCK';

export interface DriftFinding {
  field: string;
  severity: AntiDriftStatus;
  message: string;
  grValue?: string | number;
  listingValue?: string | number;
}

export interface DriftReport {
  status: AntiDriftStatus;
  findings: DriftFinding[];
  checkedAt: string;
}

export interface DriftInput {
  priceDisplay?: number;
  areaDisplay?: number;
}
