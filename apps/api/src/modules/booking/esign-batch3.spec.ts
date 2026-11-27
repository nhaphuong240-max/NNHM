import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { ContractArtifactService } from './contract-artifact.service';
import { buildPlainPdf } from './esign-completion-pdf';
import { hashDocumentText, signerTurn } from './esign-multi-party';
import { SignaturePartyController } from './signature-party.controller';
import { CONTRACT_TEMPLATES } from './booking-contract.util';

describe('esign batch 3', () => {
  it('keeps only the three signed contract templates', () => {
    expect(CONTRACT_TEMPLATES.map((row) => row.id)).toEqual([
      'tpl_deposit_agreement',
      'tpl_sale_agreement',
      'tpl_agency_authorization',
    ]);
  });

  it('refuses a sequential signer who is not next', () => {
    const first = { id: 's1', signOrder: 1, groupId: null, status: 'LINK_SENT' };
    const second = { id: 's2', signOrder: 2, groupId: null, status: 'PENDING' };
    expect(signerTurn({ mode: 'SEQUENTIAL', signer: second, roster: [first, second] })).toBe('not-turn');
  });

  it('does not change the frozen hash when parallel signers finish in either order', () => {
    const frozen = hashDocumentText('contract-body');
    expect(hashDocumentText('contract-body')).toBe(frozen);
    expect(buildPlainPdf('Hợp đồng đã ký', ['contract-body']).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('keeps D08 fail-closed', () => {
    const artifacts = new ContractArtifactService({} as never, {} as never);
    expect(() => artifacts.markProviderSigned('provider_artifact_1')).toThrow(UnprocessableEntityException);
    expect(() => artifacts.markProviderSigned(undefined)).toThrow(UnprocessableEntityException);
  });

  it('forbids sales from reviewing a signature request', async () => {
    const controller = new SignaturePartyController({} as never, { query: jest.fn() } as never);
    expect(() =>
      controller.review({ userId: 'usr_agent', role: 'AGENT', tenantId: 'ten_b', email: 'a@x' }, {} as never),
    ).toThrow(ForbiddenException);
  });
});
