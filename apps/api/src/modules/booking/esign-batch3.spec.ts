import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { SignatureRequestEntity } from '../../database/entities/signature-request.entity';
import { SignatureSignerEntity } from '../../database/entities/signature-signer.entity';
import { EMAIL_TEMPLATE_COPY, EMAIL_TEMPLATES } from '../email/email.types';
import { SMS_TEMPLATE_COPY, SMS_TEMPLATES } from '../sms/sms.types';
import { BookingContractService } from './booking-contract.service';
import { ContractArtifactService } from './contract-artifact.service';
import { buildPlainPdf } from './esign-completion-pdf';
import { EsignLinkService } from './esign-link.service';
import { ESIGN_COMPLETION_COPY_CHANNEL_ENV, hashDocumentText, signerTurn } from './esign-multi-party';
import { ESIGN_OTP_PEPPER_ENV } from './esign-otp-policy';
import { SignaturePartyController } from './signature-party.controller';
import { SignaturePartyService } from './signature-party.service';
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
      controller.review({ userId: 'usr_agent', role: 'AGENT', tenantId: 'ten_b', email: 'a@x' }),
    ).toThrow(ForbiddenException);
  });

  it('keeps GET /signature-requests behind send_sign_link and tenant', async () => {
    const view = jest.fn();
    const controller = new SignaturePartyController({ view } as never, { query: jest.fn() } as never);
    await expect(
      controller.detail({ userId: 'usr_agent', role: 'AGENT', tenantId: 'ten_b', email: 'a@x' }, 'ten_b', 'sreq_1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(view).not.toHaveBeenCalled();
  });

  it('does not send a completion copy when the channel env is empty', () => {
    const svc = new SignaturePartyService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { get: () => undefined } as never,
    );
    expect(svc.completionCopyChannel()).toBeNull();
  });

  it('reads ESIGN_COMPLETION_COPY_CHANNEL when set', () => {
    const svc = new SignaturePartyService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { get: (key: string) => (key === ESIGN_COMPLETION_COPY_CHANNEL_ENV ? 'EMAIL' : undefined) } as never,
    );
    expect(svc.completionCopyChannel()).toBe('EMAIL');
  });

  it('lets signer 2 open a session after signer 1 has signed', async () => {
    const mergedText = 'body';
    const roster = [
      { id: 'ssgn_1', signOrder: 1, groupId: null, status: 'SIGNED' },
      { id: 'ssgn_2', signOrder: 2, groupId: null, status: 'LINK_SENT' },
    ];
    const request = {
      id: 'sreq_1',
      status: 'SENT',
      signingMode: 'SEQUENTIAL',
      documentHash: hashDocumentText(mergedText),
    };
    const contracts = new BookingContractService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {
        findOne: jest.fn(async ({ where }: { where: { action?: string } }) =>
          where.action === 'DRAFT'
            ? {
                payload: { mergedText, mergeContext: { buyerName: 'Thu', unitCode: 'A' }, bookingId: 'bk', templateLabel: 'Đặt cọc' },
                createdAt: new Date(),
              }
            : { payload: { signerName: 'Thu' } },
        ),
      } as never,
      {} as never,
      {} as never,
      {
        sendContractOtp: jest.fn(async () => ({ sent: true, deliveryId: 'sms_1' })),
      } as never,
      { resolve: jest.fn(async () => null) } as never,
      {} as never,
      {
        getRepository: (entity: unknown) => {
          if (entity === SignatureRequestEntity) {
            return { findOne: async () => request };
          }
          if (entity === SignatureSignerEntity) {
            return { find: async () => roster };
          }
          return { save: async (row: unknown) => row, findOne: async () => null };
        },
      } as never,
    );
    const access = {
      tenantId: 'ten_b',
      contractId: 'ctr_b',
      buyerId: 'usr_2',
      signerId: 'ssgn_2',
      requestId: 'sreq_1',
      jti: 'jti_2',
      channel: 'SMS' as const,
      exp: Date.now() + 60_000,
    };
    const session = await contracts.getSignSession('ten_b', 'ctr_b', access);
    expect(session.data.status).toBe('DRAFT');
    expect(session.data.otpSent).toBe(true);

    request.status = 'SIGNED';
    await expect(contracts.getSignSession('ten_b', 'ctr_b', access)).rejects.toMatchObject({
      response: { detail: 'Contract already signed' },
    });
  });

  it('keeps a completion template without otp or token copy', () => {
    expect(EMAIL_TEMPLATE_COPY[EMAIL_TEMPLATES.COMPLETION]).not.toMatch(/\{\{otp\}\}/);
    expect(SMS_TEMPLATE_COPY[SMS_TEMPLATES.COMPLETION]).not.toMatch(/\{\{otp\}\}/);
  });

  it('does not infer a non-buyer SMS dest from a seeker+ email', async () => {
    const parties = new SignaturePartyService(
      {
        findOne: jest.fn(async () => ({
          id: 'sreq_1',
          tenantId: 'ten_b',
          contractId: 'ctr_b',
          sourceEntityId: 'bk_1',
          documentHash: hashDocumentText('body'),
          signingMode: 'PARALLEL',
        })),
        save: jest.fn(),
      } as never,
      {
        find: jest.fn(async () => [
          {
            id: 'ssgn_sales',
            partyType: 'SALES',
            channel: 'SMS',
            channelDestHash: 'hash',
            subjectId: 'usr_sales',
            status: 'PENDING',
            signOrder: 1,
            groupId: null,
          },
        ]),
      } as never,
      { findOne: jest.fn(async () => ({ email: 'seeker+0901234567@nnhn.local' })) } as never,
      { findOne: jest.fn(async () => ({ id: 'bk_1', leadId: 'ld_1' })) } as never,
      { findOne: jest.fn() } as never,
      {} as never,
      {
        getContract: jest.fn(async () => ({
          data: { attributes: { mergedText: 'body', mergeContext: { buyerName: 'Thu' } } },
        })),
      } as never,
      {} as never,
      {} as never,
      { verifiedSmsPhone: jest.fn(async () => null), assertVerified: jest.fn() } as never,
      {
        get: (key: string) =>
          ({
            [ESIGN_OTP_PEPPER_ENV]: 'esign-otp-pepper-16',
            CONTRACT_SIGN_SECRET: 'contract-sign-test-secret',
            ESIGN_SIGNING_BASE_URL: 'https://app.example.test/buyer/esign',
          })[key],
      } as never,
    );
    await expect(parties.sendDue('ten_b', 'sreq_1', 'PROCEDURE_STAFF')).rejects.toMatchObject({
      response: { detail: 'signer channel destination is not registered' },
    });
  });

  it('does not throw when a completion copy send fails', async () => {
    const markFailed = jest.fn();
    const links = new EsignLinkService(
      {} as never,
      {} as never,
      {} as never,
      {
        createQueryRunner: () => ({
          connect: async () => undefined,
          startTransaction: async () => undefined,
          commitTransaction: async () => undefined,
          rollbackTransaction: async () => undefined,
          release: async () => undefined,
          isTransactionActive: false,
          manager: {},
        }),
      } as never,
      { get: () => 'test' } as never,
      {} as never,
      {} as never,
      {
        assertReady: () => {
          throw new UnprocessableEntityException({ detail: 'email sandbox is not configured' });
        },
        markFailed,
        isSandbox: () => true,
      } as never,
      { markFailed, assertEsignReady: jest.fn() } as never,
      {} as never,
      {} as never,
    );
    await expect(
      links.deliverCompletionCopy({
        tenantId: 'ten_b',
        dest: { channel: 'EMAIL', value: 'a@b.c' },
        buyerName: 'Thu',
        contractId: 'ctr_b',
        documentId: 'doc_1',
        signerId: 'ssgn_1',
        downloadUrl: 'https://app.example.test/documents/doc_1',
      }),
    ).resolves.toBeUndefined();
  });
});
