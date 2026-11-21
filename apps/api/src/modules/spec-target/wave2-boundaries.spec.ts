import { UnprocessableEntityException } from '@nestjs/common';
import { retrievalCitations } from '../ai-copilot/copilot.service';
import { ContractArtifactService } from '../booking/contract-artifact.service';
import { HandoverChecklistService } from '../booking/handover-checklist.service';
import { CommissionStagesService } from '../commission/commission-stages.service';
import { signedDataProductPrice } from '../integrations/erp-invoicing.service';
import { assertNotaryStaysSandbox } from '../integrations/notary-webhook-journal';

describe('unsigned wave 2 boundaries', () => {
  it('refuses a signed artifact, a receivable, a paid commission, a live notary call, and an invented price', () => {
    const artifacts = new ContractArtifactService({} as never, {} as never);
    const handover = new HandoverChecklistService({} as never, {} as never);
    const commission = new CommissionStagesService({} as never);
    expect(() => artifacts.markProviderSigned(undefined)).toThrow(UnprocessableEntityException);
    expect(() => artifacts.markProviderSigned('provider_artifact_1')).toThrow(UnprocessableEntityException);
    expect(() => handover.postReceivable()).toThrow(UnprocessableEntityException);
    expect(() => commission.recordPaid(null)).toThrow(UnprocessableEntityException);
    expect(() => commission.recordPaid('bank-ref')).toThrow(UnprocessableEntityException);
    expect(() => assertNotaryStaysSandbox('https://notary.example')).toThrow(UnprocessableEntityException);
    expect(assertNotaryStaysSandbox(undefined)).toBeUndefined();
    expect(signedDataProductPrice()).toBeNull();
    expect(retrievalCitations()).toEqual([]);
  });
});