export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AnomalyQueueStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

export type AnomalySignal = {
  code: string;
  label: string;
  severity: AnomalySeverity;
  score: number;
  detail: string;
};

export type AnomalyRecord = {
  id: string;
  listingId: string;
  unitId: string;
  unitCode?: string;
  title: string;
  listingStatus: string;
  signals: AnomalySignal[];
  mlScore: number;
  severity: AnomalySeverity;
  queueStatus: AnomalyQueueStatus;
  flaggedAt: string;
  slaDeadlineAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  resolvedBy?: string;
};

export type AnomalyScanInput = {
  listing: {
    id: string;
    unitId: string;
    title: string;
    status: string;
    priceDisplay: string | null;
    antiDriftStatus: string;
    createdAt: Date;
  };
  unit: {
    code: string;
    basePrice: string;
    status: string;
    area: string;
  };
  duplicateCountOnUnit: number;
};

export type AnomalyResolveInput = {
  note?: string;
  action: 'RESOLVE' | 'DISMISS';
};
