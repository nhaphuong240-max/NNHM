import type { KycStatus, KycSubjectType } from '../../database/entities/kyc-profile.entity';

export interface KycProfileRecord {
  id: string;
  attributes: {
    subjectType: KycSubjectType;
    subjectId: string;
    status: KycStatus;
    verifiedAt?: string;
    notes?: string;
    updatedAt: string;
  };
}

export interface KycPayoutBlock {
  entryId?: string;
  recipientType: string;
  recipientId: string;
  subjectType: KycSubjectType;
  kycStatus: KycStatus;
}
