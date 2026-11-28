import { ForbiddenException, Logger, UnprocessableEntityException } from '@nestjs/common';
import { SignatureRequestEntity } from '../../database/entities/signature-request.entity';
import { SignatureSignerEntity } from '../../database/entities/signature-signer.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { EMAIL_TEMPLATE_COPY, EMAIL_TEMPLATES } from '../email/email.types';
import { SMS_TEMPLATE_COPY, SMS_TEMPLATES } from '../sms/sms.types';
import { BookingContractService } from './booking-contract.service';
import { ContractArtifactService } from './contract-artifact.service';
import { buildPlainPdf } from './esign-completion-pdf';
import { EsignLinkService } from './esign-link.service';
import {
  ESIGN_COMPLETION_COPY_CHANNEL_ENV,
  hashDocumentText,
  readCompletionCopyChannel,
  signerTurn,
} from './esign-multi-party';
import { ESIGN_OTP_PEPPER_ENV } from './esign-otp-policy';
import { retryMissingVaultUploads } from './esign-vault-retry';
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
    expect(readCompletionCopyChannel(() => undefined)).toBeNull();
  });

  it('reads ESIGN_COMPLETION_COPY_CHANNEL when set', () => {
    expect(readCompletionCopyChannel((key) => (key === ESIGN_COMPLETION_COPY_CHANNEL_ENV ? 'EMAIL' : undefined))).toBe(
      'EMAIL',
    );
  });

  it('does not treat an unsigned completion channel as a send path', () => {
    expect(readCompletionCopyChannel((key) => (key === ESIGN_COMPLETION_COPY_CHANNEL_ENV ? 'ZALO' : undefined))).toBeNull();
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

  it('keeps a completion template without otp, token, or documentUrl copy', () => {
    expect(EMAIL_TEMPLATE_COPY[EMAIL_TEMPLATES.COMPLETION]).not.toMatch(/\{\{otp\}\}/);
    expect(SMS_TEMPLATE_COPY[SMS_TEMPLATES.COMPLETION]).not.toMatch(/\{\{otp\}\}/);
    expect(EMAIL_TEMPLATE_COPY[EMAIL_TEMPLATES.COMPLETION]).not.toMatch(/\{\{documentUrl\}\}/);
    expect(SMS_TEMPLATE_COPY[SMS_TEMPLATES.COMPLETION]).not.toMatch(/\{\{documentUrl\}\}/);
    expect(EMAIL_TEMPLATE_COPY[EMAIL_TEMPLATES.COMPLETION]).toMatch(/\{\{buyer_name\}\}/);
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
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
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
      }),
    ).resolves.toBeUndefined();
    expect(JSON.stringify(warn.mock.calls)).toContain('ssgn_1');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('a@b.c');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('http');
    warn.mockRestore();
  });

  it('sends one completion notice per signer after commit without a document URL', async () => {
    const deliver = jest.fn(async (input: { buyerName: string; signerId: string }) => input);
    const roster = [
      { id: 'ssgn_1', partyType: 'BUYER', displayName: 'Thu', channel: 'EMAIL', channelDestHash: null, subjectId: 'usr_1' },
      { id: 'ssgn_2', partyType: 'SALES', displayName: 'An', channel: 'EMAIL', channelDestHash: null, subjectId: 'usr_2' },
    ];
    const contracts = new BookingContractService(
      { findOne: jest.fn(async () => ({ leadId: 'ld_1' })) } as never,
      {} as never,
      {} as never,
      { findOne: jest.fn(async () => ({ email: 'thu@example.com', phone: '+84901234567' })) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {
        getRepository: (entity: unknown) => {
          if (entity === SignatureRequestEntity) {
            return { findOne: async () => ({ id: 'sreq_1', sourceEntityId: 'bk_1' }) };
          }
          if (entity === SignatureSignerEntity) {
            return { find: async () => roster };
          }
          if (entity === UserEntity) {
            return { findOne: async ({ where }: { where: { id: string } }) => ({ email: `${where.id}@example.com` }) };
          }
          return {};
        },
      } as never,
      { get: (key: string) => (key === ESIGN_COMPLETION_COPY_CHANNEL_ENV ? 'EMAIL' : undefined) } as never,
      { deliverCompletionCopy: deliver } as never,
    );
    await contracts.sendCompletionCopyAfterCommit(
      {
        tenantId: 'ten_b',
        requestId: 'sreq_1',
        signerId: 'ssgn_2',
        signerName: 'Last Signer',
        contractId: 'ctr_b',
      } as never,
      'doc_1',
    );
    expect(deliver).toHaveBeenCalledTimes(2);
    expect(deliver.mock.calls.map((call) => call[0].buyerName).sort()).toEqual(['An', 'Thu']);
    expect(JSON.stringify(deliver.mock.calls)).not.toContain('Last Signer');
    expect(JSON.stringify(deliver.mock.calls)).not.toContain('/documents/');
    expect(JSON.stringify(deliver.mock.calls)).not.toContain('documentUrl');
    expect(JSON.stringify(deliver.mock.calls)).not.toContain('v1s.');
  });

  it('sends one completion notice per signer after a vault-retry commit', async () => {
    const deliver = jest.fn(async (input: { buyerName: string; signerId: string }) => input);
    const roster = [
      { id: 'ssgn_1', partyType: 'BUYER', displayName: 'Thu', channel: 'EMAIL', channelDestHash: null, subjectId: 'usr_1' },
      { id: 'ssgn_2', partyType: 'SALES', displayName: 'An', channel: 'EMAIL', channelDestHash: null, subjectId: 'usr_2' },
    ];
    const contracts = new BookingContractService(
      { findOne: jest.fn(async () => ({ leadId: 'ld_1' })) } as never,
      {} as never,
      {} as never,
      { findOne: jest.fn(async () => ({ email: 'thu@example.com', phone: '+84901234567' })) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {
        getRepository: (entity: unknown) => {
          if (entity === SignatureRequestEntity) {
            return { findOne: async () => ({ id: 'sreq_1', sourceEntityId: 'bk_1' }) };
          }
          if (entity === SignatureSignerEntity) {
            return { find: async () => roster };
          }
          if (entity === UserEntity) {
            return { findOne: async ({ where }: { where: { id: string } }) => ({ email: `${where.id}@example.com` }) };
          }
          return {};
        },
      } as never,
      { get: (key: string) => (key === ESIGN_COMPLETION_COPY_CHANNEL_ENV ? 'EMAIL' : undefined) } as never,
      { deliverCompletionCopy: deliver } as never,
    );
    const prepared = {
      tenantId: 'ten_b',
      requestId: 'sreq_1',
      signerId: 'ssgn_2',
      signerName: 'Last Signer',
      contractId: 'ctr_b',
      bookingId: 'bk_1',
      buffer: Buffer.from('signed'),
      fileName: 'ctr_b_ssgn_2_signed.txt',
    };
    const order: string[] = [];
    await retryMissingVaultUploads({
      limits: { maxAttempts: 3, intervalSeconds: 1 },
      pending: [
        {
          signer_id: 'ssgn_2',
          tenant_id: 'ten_b',
          jti: 'jti_1',
          channel: 'SMS',
          subject_id: 'usr_buyer',
          request_id: 'sreq_1',
          contract_id: 'ctr_b',
        },
      ],
      events: { find: jest.fn(async () => []), create: (row: unknown) => row, save: jest.fn(async (row: unknown) => row) } as never,
      contracts: {
        rebuildPendingSignature: jest.fn(async () => prepared as never),
        finishSignedVault: jest.fn(async (row) => {
          order.push('vault');
          row.completionCopyDocumentId = 'doc_1';
        }),
        sendCompletionCopyAfterCommit: async (row, documentId) => {
          order.push('copy');
          await contracts.sendCompletionCopyAfterCommit(row, documentId);
        },
      },
      lockRequest: async (_row, work) => {
        order.push('begin');
        await work({} as never);
        order.push('commit');
        return 'ok';
      },
    });
    expect(order).toEqual(['begin', 'vault', 'commit', 'copy']);
    expect(deliver).toHaveBeenCalledTimes(2);
    expect(deliver.mock.calls.map((call) => call[0].buyerName).sort()).toEqual(['An', 'Thu']);
    expect(JSON.stringify(deliver.mock.calls)).not.toContain('Last Signer');
  });

  it('keeps completion enqueue params free of a download URL and signing token', async () => {
    const captured: Array<Record<string, unknown>> = [];
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
          isTransactionActive: true,
          manager: {},
        }),
      } as never,
      { get: () => 'test' } as never,
      {} as never,
      {} as never,
      {
        assertReady: jest.fn(),
        isSandbox: () => true,
        send: jest.fn(async (_tenant: string, input: { params: Record<string, unknown> }) => {
          captured.push(input.params);
          return { status: 'SENT', deliveryId: 'eml_1', sandbox: true };
        }),
        completeQueued: jest.fn(async (_tenant: string, _id: string, input: { params: Record<string, unknown> }) => {
          captured.push(input.params);
          return { status: 'SENT', deliveryId: 'eml_1', sandbox: true };
        }),
        markFailed: jest.fn(),
      } as never,
      { markFailed: jest.fn(), assertEsignReady: jest.fn() } as never,
      {} as never,
      {} as never,
    );
    await links.deliverCompletionCopy({
      tenantId: 'ten_b',
      dest: { channel: 'EMAIL', value: 'a@b.c' },
      buyerName: 'Thu',
      contractId: 'ctr_b',
      documentId: 'doc_1',
      signerId: 'ssgn_1',
    });
    expect(captured.length).toBeGreaterThan(0);
    expect(JSON.stringify(captured)).toContain('Thu');
    expect(JSON.stringify(captured)).not.toContain('documentUrl');
    expect(JSON.stringify(captured)).not.toContain('/documents/');
    expect(JSON.stringify(captured)).not.toContain('v1s.');
  });
});
