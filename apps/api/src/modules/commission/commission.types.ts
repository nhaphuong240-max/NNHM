import type { KycStatus } from '../../database/entities/kyc-profile.entity';

export type CommissionPolicyStatus = 'DRAFT' | 'PUBLISHED';
export type CommissionBaseType = 'DEPOSIT' | 'SALE_PRICE';
export type CommissionSplitRole = 'PRIMARY' | 'CO_BROKER' | 'AGENCY';
export type CommissionSnapshotStatus = 'CALCULATED' | 'HOLDBACK' | 'RELEASED' | 'PAID';
export type CommissionPayoutStatus = 'PENDING' | 'HOLDBACK' | 'APPROVED' | 'PAID';
export type SettlementRunStatus = 'PENDING' | 'SUBMITTED' | 'COMPLETED' | 'FAILED';
export type CommissionDisputeStatus = 'OPEN' | 'RESOLVED';

export interface CommissionSplitRule {
  role: CommissionSplitRole;
  recipientId: string;
  percent: number;
}

export interface CreatePolicyInput {
  projectId: string;
  name: string;
  ratePercent: number;
  baseType?: CommissionBaseType;
  splitRules: CommissionSplitRule[];
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdatePolicyInput {
  name?: string;
  ratePercent?: number;
  baseType?: CommissionBaseType;
  splitRules?: CommissionSplitRule[];
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface OpenHoldbackInput {
  reason: string;
  holdbackPercent?: number;
}

export interface PolicyRecord {
  id: string;
  attributes: {
    projectId: string;
    version: number;
    status: CommissionPolicyStatus;
    name: string;
    ratePercent: number;
    baseType: CommissionBaseType;
    splitRules: CommissionSplitRule[];
    effectiveFrom?: string;
    effectiveTo?: string;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface SnapshotRecord {
  id: string;
  attributes: {
    bookingId: string;
    policyId: string;
    policyVersion: number;
    policyHash: string;
    dealAmount: number;
    totalCommission: number;
    status: CommissionSnapshotStatus;
    calculatedAt: string;
  };
}

export interface EntryRecord {
  id: string;
  attributes: {
    snapshotId: string;
    bookingId?: string;
    recipientType: string;
    recipientId: string;
    role: CommissionSplitRole;
    splitPercent: number;
    amount: number;
    payoutStatus: CommissionPayoutStatus;
    settlementRunId?: string;
    kycStatus?: KycStatus;
    payoutEligible?: boolean;
    createdAt?: string;
  };
}

export interface ApproveLinesInput {
  entryIds: string[];
}

export interface CreateSettlementRunInput {
  label?: string;
  periodFrom?: string;
  periodTo?: string;
  entryIds?: string[];
}

export interface SettlementRunRecord {
  id: string;
  attributes: {
    status: SettlementRunStatus;
    label?: string;
    periodFrom?: string;
    periodTo?: string;
    entryCount: number;
    totalAmount: number;
    createdBy?: string;
    completedAt?: string;
    createdAt: string;
    payout?: {
      status: 'SUBMITTED' | 'SKIPPED' | 'FAILED';
      batchId?: string;
      provider?: string;
    };
  };
}

export interface DisputeRecord {
  id: string;
  attributes: {
    snapshotId: string;
    bookingId?: string;
    reason: string;
    status: CommissionDisputeStatus;
    holdbackPercent: number;
    openedAt: string;
    resolvedAt?: string;
  };
}
