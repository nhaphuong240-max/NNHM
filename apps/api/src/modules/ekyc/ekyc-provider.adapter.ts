export type EkycVerificationStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

export type EkycStartInput = {
  tenantId: string;
  subjectType: 'USER' | 'AGENCY';
  subjectId: string;
  documentType?: string;
  callbackUrl?: string;
};

export type EkycStartResult = {
  externalRef: string;
  verificationUrl?: string;
  status: EkycVerificationStatus;
  provider: string;
};

export type EkycWebhookPayload = {
  externalRef: string;
  status: EkycVerificationStatus;
  verificationLevel?: string;
  documentType?: string;
  verifiedAt?: string;
  reason?: string;
};

export interface EkycProviderAdapter {
  readonly providerId: string;
  startVerification(input: EkycStartInput): Promise<EkycStartResult>;
  getStatus(externalRef: string): Promise<EkycVerificationStatus>;
  parseWebhook(body: unknown): EkycWebhookPayload | null;
}
