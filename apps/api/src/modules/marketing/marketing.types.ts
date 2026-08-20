import type { AgencyApplicationStatus } from '../../database/entities/agency-application.entity';
import type { DistributionPolicyStatus, DistributionTermsRow } from '../../database/entities/distribution-policy.entity';

export interface DistributionPolicyRecord {
  id: string;
  attributes: {
    tenantId: string;
    projectId: string;
    version: number;
    status: DistributionPolicyStatus;
    name: string;
    terms: DistributionTermsRow;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface CreateDistributionPolicyInput {
  projectId: string;
  name: string;
  terms?: DistributionTermsRow;
}

export interface MarketplaceProjectRecord {
  developerTenantId: string;
  developerName: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  distributionPolicyId: string;
  policyName: string;
  terms: DistributionTermsRow;
  publishedAt?: string;
  applicationStatus?: AgencyApplicationStatus | null;
}

export interface AgencyApplicationRecord {
  id: string;
  attributes: {
    developerTenantId: string;
    agencyTenantId: string;
    projectId: string;
    distributionPolicyId: string;
    status: AgencyApplicationStatus;
    message?: string;
    reviewNotes?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    createdAt: string;
    updatedAt: string;
    developerName?: string;
    agencyName?: string;
    projectName?: string;
  };
}

export interface SubmitApplicationInput {
  developerTenantId: string;
  projectId: string;
  distributionPolicyId: string;
  message?: string;
}

export interface ReviewApplicationInput {
  status: 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
}
