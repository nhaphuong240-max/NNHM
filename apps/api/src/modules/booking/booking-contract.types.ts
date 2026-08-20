export interface ContractTemplateRecord {
  id: string;
  label: string;
  description: string;
  category: 'DEPOSIT' | 'SALE' | 'AUTHORIZATION';
  version: string;
}

export interface ContractMergeContext {
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  unitCode: string;
  unitArea?: string;
  basePrice: number;
  depositAmount?: number;
  bookingId: string;
  projectName: string;
  agentLabel: string;
  contractDate: string;
}

export interface ContractPreviewInput {
  templateId: string;
  bookingId: string;
  leadId?: string;
  overrides?: Partial<Pick<ContractMergeContext, 'buyerName' | 'buyerPhone' | 'buyerEmail'>>;
}

export interface CreateContractInput extends ContractPreviewInput {
  notes?: string;
}

export type ContractStatus = 'DRAFT' | 'SIGNED';

export interface ContractDraftRecord {
  id: string;
  attributes: {
    templateId: string;
    templateLabel: string;
    bookingId: string;
    leadId?: string;
    status: ContractStatus;
    mergedText: string;
    mergeContext: ContractMergeContext;
    notes?: string;
    createdAt: string;
    createdBy?: string;
    signedAt?: string;
    signedBy?: string;
    documentVaultRef?: string;
    documentId?: string;
    signatureRef?: string;
  };
}

export interface ContractSignInput {
  signerName: string;
  otp: string;
  consent: boolean;
  envelopeId?: string;
}

export interface ContractSignSession {
  contractId: string;
  bookingId: string;
  templateLabel: string;
  status: ContractStatus;
  mergedText: string;
  buyerName: string;
  unitCode: string;
  otpHint?: string;
  otpSent?: boolean;
  signingUrl?: string;
  envelopeId?: string;
  provider?: string;
  providerMode?: string;
}
