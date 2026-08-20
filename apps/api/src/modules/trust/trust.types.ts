import type { TrustDisputeStatus, TrustDisputeType } from '../../database/entities/trust-dispute.entity';

export type TrustDisputeRecord = {
  id: string;
  attributes: {
    bookingId: string | null;
    type: TrustDisputeType;
    status: TrustDisputeStatus;
    reason: string;
    evidence: Record<string, unknown>[];
    resolutionNote: string | null;
    openedBy: string | null;
    createdAt: string;
    updatedAt: string;
    resolvedAt: string | null;
  };
};

export type OpenTrustDisputeInput = {
  bookingId?: string;
  type?: TrustDisputeType;
  reason: string;
  evidence?: Record<string, unknown>[];
};

export type ResolveTrustDisputeInput = {
  resolutionNote: string;
  status?: 'RESOLVED';
};
