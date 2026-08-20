export type EsignEnvelopeStatus = 'CREATED' | 'SENT' | 'SIGNED' | 'DECLINED' | 'EXPIRED';

export type EsignCreateInput = {
  tenantId: string;
  contractId: string;
  signerName: string;
  signerEmail?: string;
  documentText: string;
  callbackUrl?: string;
};

export type EsignCreateResult = {
  envelopeId: string;
  signingUrl?: string;
  status: EsignEnvelopeStatus;
  provider: string;
};

export type EsignWebhookPayload = {
  envelopeId: string;
  contractId: string;
  event: 'SIGNED' | 'DECLINED' | 'EXPIRED';
  signatureRef?: string;
  signedAt?: string;
};

export interface EsignProviderAdapter {
  readonly providerId: string;
  createEnvelope(input: EsignCreateInput): Promise<EsignCreateResult>;
  getSigningUrl(envelopeId: string): Promise<string | null>;
  parseWebhook(body: unknown): EsignWebhookPayload | null;
  downloadSignedPdf(envelopeId: string): Promise<Buffer | null>;
}
