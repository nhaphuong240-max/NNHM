import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { EMAIL_TEMPLATE_COPY, EMAIL_TEMPLATES } from '../email/email.types';
import { assertLiveEmailCredentials, LiveEmailSender, SandboxEmailSender } from '../email/email-sender';
import { EmailService } from '../email/email.service';
import { SMS_TEMPLATE_COPY, SMS_TEMPLATES } from '../sms/sms.types';
import { canSendSignLink } from '../identity/role-catalog';
import { BookingContractController } from './booking-contract.controller';
import {
  ESIGN_OTP_MAX_SENDS_ENV,
  ESIGN_OTP_PEPPER_ENV,
  ESIGN_OTP_RESEND_COOLDOWN_ENV,
} from './esign-otp-policy';
import { VOID_OPEN_TICKETS_SQL } from './esign-otp-atomic';
import {
  ESIGN_LINK_CHANNEL_ENV,
  ESIGN_LINK_FALLBACK_CHANNELS_ENV,
  ESIGN_SIGNING_BASE_URL_ENV,
  ESIGN_ZNS_ENABLED_ENV,
  pickRegisteredChannel,
} from './esign-link.policy';
import { BookingContractEsignSmsService } from './booking-contract-esign-sms.service';
import { EsignLinkService } from './esign-link.service';
import { EsignOtpChallengeService } from './esign-otp-challenge.service';
import { hashChannelDest } from './esign-otp-policy';
import { SandboxEsignOutbox } from './sandbox-esign-outbox';

const SECRET = 'contract-sign-test-secret';
const PEPPER = 'esign-otp-pepper-16';
const PHONE = '0900000001';
const EMAIL = 'buyer@example.test';
const PREFIX = 'ctr_b:usr_buyer';

function linkConfig(extra: Record<string, string | undefined> = {}) {
  const env: Record<string, string | undefined> = {
    CONTRACT_SIGN_SECRET: SECRET,
    [ESIGN_OTP_PEPPER_ENV]: PEPPER,
    [ESIGN_OTP_MAX_SENDS_ENV]: '4',
    [ESIGN_OTP_RESEND_COOLDOWN_ENV]: '30',
    [ESIGN_LINK_CHANNEL_ENV]: 'SMS',
    [ESIGN_SIGNING_BASE_URL_ENV]: 'https://app.example.test/buyer/esign',
    EMAIL_SANDBOX: 'true',
    ...extra,
  };
  return { get: (key: string) => env[key] };
}

function harness(
  opts: {
    config?: { get: (key: string) => string | undefined };
    phone?: string | null;
    email?: string | null;
    latest?: { created_at: Date; status: string; source_id: string; id: string };
    sendLimit?: number;
    enqueue?: jest.Mock;
    complete?: jest.Mock;
    userId?: string | null;
  } = {},
) {
  const events: Array<Record<string, unknown>> = [];
  const ticketsVoided: unknown[][] = [];
  const enqueue =
    opts.enqueue ??
    jest.fn(async () => ({
      status: 'QUEUED',
      deliveryId: 'sms_link_1',
      sandbox: true,
    }));
  const complete =
    opts.complete ??
    jest.fn(async () => ({
      status: 'SENT',
      deliveryId: 'sms_link_1',
      sandbox: true,
    }));
  const issueBuyerAccess = jest.fn(async (input: { recordLinkSent?: boolean; manager?: unknown }) => {
    expect(input.recordLinkSent).toBe(false);
    expect(input.manager).toBeTruthy();
    return {
      token: 'v1s.test.token',
      claims: {
        tenantId: 'ten_b',
        contractId: 'ctr_b',
        buyerId: 'usr_buyer',
        signerId: 'ssgn_1',
        requestId: 'sreq_1',
        jti: 'jti_1',
        channel: 'SMS',
      },
    };
  });
  const outbox = new SandboxEsignOutbox({ get: () => 'test' } as never);
  const service = new EsignLinkService(
    { findOne: jest.fn(async () => ({ id: 'bkg', leadId: 'ld' })) } as never,
    {
      findOne: jest.fn(async () => ({
        phone: opts.phone === undefined ? PHONE : opts.phone,
        email: opts.email === undefined ? EMAIL : opts.email,
        channelMeta: {},
      })),
    } as never,
    {
      findOne: jest.fn(async () => (opts.userId === null ? null : { id: opts.userId ?? 'usr_buyer' })),
    } as never,
    {
      query: jest.fn(async () => []),
      createQueryRunner: () => ({
        connect: async () => undefined,
        startTransaction: async () => undefined,
        commitTransaction: async () => undefined,
        rollbackTransaction: async () => undefined,
        release: async () => undefined,
        isTransactionActive: true,
        manager: { getRepository: () => ({}) },
        query: async (sql: string, params?: unknown[]) => {
          if (String(sql).includes('VOID') || sql === VOID_OPEN_TICKETS_SQL) {
            ticketsVoided.push(params ?? []);
          }
          if (String(sql).includes('UNION')) {
            return opts.latest ? [opts.latest] : [];
          }
          return [];
        },
      }),
      getRepository: () => ({
        save: jest.fn(async (row: Record<string, unknown>) => {
          events.push(row);
          return row;
        }),
      }),
    } as never,
    (opts.config ?? linkConfig()) as never,
    { issueBuyerAccess } as never,
    {
      assertSendBudget: jest.fn(async () => {
        if ((opts.sendLimit ?? 0) >= 4) {
          throw new UnprocessableEntityException({ detail: 'esign otp send limit is exhausted' });
        }
      }),
    } as never,
    {
      send: jest.fn(),
      completeQueued: jest.fn(),
      findBySource: jest.fn(),
      markFailed: jest.fn(),
      assertReady: jest.fn((templateId: string) => {
        const cfg = opts.config ?? linkConfig();
        const sandbox = cfg.get('EMAIL_SANDBOX')?.trim();
        if (sandbox !== 'true' && sandbox !== 'false') {
          throw new UnprocessableEntityException({ detail: 'email sandbox is not configured' });
        }
        if (sandbox === 'false') {
          assertLiveEmailCredentials((key) => cfg.get(key));
        }
        void templateId;
      }),
      isSandbox: jest.fn(() => (opts.config ?? linkConfig()).get('EMAIL_SANDBOX') === 'true'),
    } as never,
    {
      enqueueEsignLink: enqueue,
      completeEsignLink: complete,
      findBySource: jest.fn(),
      markFailed: jest.fn(),
      assertEsignReady: jest.fn(async () => undefined),
      isSandbox: jest.fn(async () => true),
    } as never,
    outbox,
    { assertVerified: jest.fn(async () => undefined) } as never,
  );
  return { service, enqueue, complete, issueBuyerAccess, events, ticketsVoided, outbox };
}

const sendInput = {
  tenantId: 'ten_b',
  contractId: 'ctr_b',
  bookingId: 'bkg',
  buyerName: 'Thu',
};

describe('esign batch 2 send link', () => {
  it('refuses send when the destination channel is not verified', async () => {
    const { service, enqueue } = harness();
    (service as unknown as { channels: { assertVerified: jest.Mock } }).channels.assertVerified = jest.fn(async () => {
      throw new UnprocessableEntityException({ detail: 'signer channel is not verified' });
    });
    await expect(service.send(sendInput)).rejects.toMatchObject({
      response: { detail: 'signer channel is not verified' },
    });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('rejects a missing registered destination', async () => {
    const { service, enqueue } = harness({ phone: '', email: null });
    await expect(service.send(sendInput)).rejects.toMatchObject({
      response: { detail: 'signer phone is not registered' },
    });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('rejects missing email config and does not call a provider', async () => {
    const fetchImpl = jest.fn();
    const { service, enqueue } = harness({
      config: linkConfig({ [ESIGN_LINK_CHANNEL_ENV]: 'EMAIL', EMAIL_SANDBOX: undefined }),
    });
    await expect(service.send(sendInput)).rejects.toMatchObject({
      response: { detail: 'email sandbox is not configured' },
    });
    expect(enqueue).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('stays in sandbox and does not call a live email API', async () => {
    const fetchImpl = jest.fn();
    const sender = new SandboxEmailSender();
    await sender.send({
      to: EMAIL,
      templateId: EMAIL_TEMPLATES.SIGN_LINK,
      params: { signingUrl: 'https://app.example.test/buyer/esign#signToken=v1s.test.token' },
      trackingId: 'eml_1',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    const live = new LiveEmailSender(() => undefined, fetchImpl as never);
    await expect(
      live.send({
        to: EMAIL,
        templateId: EMAIL_TEMPLATES.SIGN_LINK,
        params: {},
        trackingId: 'eml_1',
      }),
    ).rejects.toMatchObject({ response: { detail: 'email provider is not configured' } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends SMS while Zalo stays unimplemented even when the flag is on', async () => {
    const { service, enqueue } = harness({
      config: linkConfig({ [ESIGN_ZNS_ENABLED_ENV]: 'true', [ESIGN_LINK_FALLBACK_CHANNELS_ENV]: undefined }),
    });
    const result = await service.send(sendInput);
    expect(result.channel).toBe('SMS');
    expect(result).not.toHaveProperty('signingUrl');
    expect(JSON.stringify(result)).not.toContain('v1s.');
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0][1].templateId).toBe(SMS_TEMPLATES.SIGN_LINK);
  });

  it('keeps cooldown and MAX_SENDS when a new ticket is minted', async () => {
    const cooling = harness({
      latest: { created_at: new Date(), status: 'SENT', source_id: `${PREFIX}:ab12`, id: 'sms_old' },
    });
    await expect(cooling.service.send({ ...sendInput, resend: true })).rejects.toMatchObject({
      response: { detail: 'esign otp resend is cooling down' },
    });
    expect(cooling.enqueue).not.toHaveBeenCalled();

    const exhausted = harness({ sendLimit: 4 });
    await expect(exhausted.service.send(sendInput)).rejects.toMatchObject({
      response: { detail: 'esign otp send limit is exhausted' },
    });
    expect(exhausted.issueBuyerAccess).not.toHaveBeenCalled();
  });

  it('replays an open resend source without minting a ticket or LINK_SENT', async () => {
    const { service, enqueue, issueBuyerAccess, events } = harness({
      latest: { created_at: new Date(), status: 'SENT', source_id: `${PREFIX}:ab12`, id: 'sms_open' },
    });
    const result = await service.send(sendInput);
    expect(result.idempotentReplay).toBe(true);
    expect(result.deliveryId).toBe('sms_open');
    expect(enqueue).not.toHaveBeenCalled();
    expect(issueBuyerAccess).not.toHaveBeenCalled();
    expect(events.some((row) => row.action === 'LINK_SENT')).toBe(false);
  });

  it('voids unused tickets on resend', async () => {
    const { service, ticketsVoided, enqueue } = harness({
      latest: { created_at: new Date(Date.now() - 120_000), status: 'SENT', source_id: PREFIX, id: 'sms_old' },
    });
    const result = await service.send({ ...sendInput, resend: true });
    expect(result.sent).toBe(true);
    expect(ticketsVoided.length).toBeGreaterThan(0);
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it('replays an in-flight QUEUED row without reading a token from memory', async () => {
    const { service, issueBuyerAccess, complete, ticketsVoided } = harness({
      latest: { created_at: new Date(), status: 'QUEUED', source_id: PREFIX, id: 'sms_q' },
    });
    const result = await service.send(sendInput);
    expect(result.deliveryId).toBe('sms_q');
    expect(result.idempotentReplay).toBe(true);
    expect(issueBuyerAccess).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(ticketsVoided).toHaveLength(0);
  });

  it('reads an existing unique row instead of sending again without a url', async () => {
    const complete = jest.fn(async () => {
      const err = new Error('dup') as Error & { code: string };
      err.code = '23505';
      throw err;
    });
    const findBySource = jest.fn(async () => ({ id: 'sms_link_1', status: 'SENT' }));
    const { service } = harness({ complete });
    (service as unknown as { sms: { findBySource: jest.Mock } }).sms.findBySource = findBySource;
    const result = await service.send(sendInput);
    expect(result.deliveryId).toBe('sms_link_1');
    const firstCall = complete.mock.calls[0] as unknown as [string, string, { params?: { signingUrl?: string } }];
    expect(firstCall[2].params?.signingUrl).toContain('signToken=');
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('does not persist raw phone, email, token, or otp on events', async () => {
    const { service, events } = harness();
    const result = await service.send(sendInput);
    expect(JSON.stringify(result)).not.toContain(PHONE);
    expect(JSON.stringify(result)).not.toContain('v1s.test.token');
    expect(JSON.stringify(events)).not.toContain(PHONE);
    expect(JSON.stringify(events)).not.toContain(EMAIL);
    expect(JSON.stringify(events)).not.toContain('v1s.test.token');
    expect(events.some((row) => row.action === 'LINK_SENT')).toBe(true);
  });

  it('does not put an OTP in the sign-link templates', () => {
    expect(SMS_TEMPLATE_COPY[SMS_TEMPLATES.SIGN_LINK]).not.toMatch(/otp/i);
    expect(SMS_TEMPLATE_COPY[SMS_TEMPLATES.OTP]).toMatch(/otp/i);
    expect(EMAIL_TEMPLATE_COPY[EMAIL_TEMPLATES.SIGN_LINK]).not.toMatch(/otp/i);
  });

  it('does not silently switch channel when Zalo is off and no fallback is set', () => {
    const picked = pickRegisteredChannel({
      preferred: 'ZALO',
      fallback: [],
      dest: { SMS: PHONE, EMAIL, ZALO: 'oa_user' },
      znsOn: false,
    });
    expect(picked).toEqual({ ok: false, detail: 'esign zalo is disabled' });
  });

  it('closes POST /contracts/:id/sign-link for SEEKER and other roles without send_sign_link', async () => {
    const links = { send: jest.fn() };
    const getContract = jest.fn();
    const controller = new BookingContractController(
      { getContract } as never,
      { get: () => SECRET } as never,
      { query: jest.fn() } as never,
      undefined,
      links as never,
    );
    await expect(
      controller.sendSignLink({ userId: 'usr_a', role: 'SEEKER', tenantId: 'ten_b', email: 'a@x' }, 'ten_b', 'ctr_b', {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.sendSignLink({ userId: 'usr_agent', role: 'AGENT', tenantId: 'ten_b', email: 'a@x' }, 'ten_b', 'ctr_other', {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.sendSignLink(
        { userId: 'usr_fin', role: 'FINANCE_ADMIN', tenantId: 'ten_b', email: 'a@x' },
        'ten_b',
        'ctr_b',
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(canSendSignLink('SEEKER')).toBe(false);
    expect(canSendSignLink('AGENT')).toBe(false);
    expect(canSendSignLink('FINANCE_ADMIN')).toBe(false);
    expect(getContract).not.toHaveBeenCalled();
    expect(links.send).not.toHaveBeenCalled();
  });

  it('lets PROCEDURE_STAFF send using the booking buyer, not the caller', async () => {
    const links = { send: jest.fn(async (input: { buyerId?: string; bookingId: string }) => {
      expect(input).not.toHaveProperty('buyerId');
      expect(input.bookingId).toBe('bk_owned');
      return { sent: true, channel: 'SMS', destMasked: '09****01', deliveryId: 'sms_1', sandbox: true };
    }) };
    const query = jest.fn(async () => [{ tenant_id: 'ten_b' }]);
    const controller = new BookingContractController(
      {
        getContract: jest.fn(async () => ({
          data: { id: 'ctr_b', attributes: { bookingId: 'bk_owned', mergeContext: { buyerName: 'Thu' } } },
        })),
      } as never,
      { get: () => SECRET } as never,
      {
        query,
        createQueryRunner: () => ({ connect: async () => undefined, release: async () => undefined, query }),
        getRepository: () => ({ save: jest.fn(async (row: unknown) => row) }),
      } as never,
      undefined,
      links as never,
    );
    expect(canSendSignLink('PROCEDURE_STAFF')).toBe(true);
    const result = await controller.sendSignLink(
      { userId: 'usr_staff', role: 'PROCEDURE_STAFF', tenantId: 'ten_b', email: 'staff@x' },
      'ten_b',
      'ctr_b',
      {},
    );
    expect(links.send).toHaveBeenCalledTimes(1);
    expect(result.data.deliveryId).toBe('sms_1');
  });

  it('404s send-link when the caller has no tenant', async () => {
    const links = { send: jest.fn() };
    const controller = new BookingContractController(
      { getContract: jest.fn() } as never,
      { get: () => SECRET } as never,
      { query: jest.fn() } as never,
      undefined,
      links as never,
    );
    await expect(
      controller.sendSignLink(
        { userId: 'usr_staff', role: 'PROCEDURE_STAFF', tenantId: '', email: 'staff@x' },
        'ten_b',
        'ctr_b',
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(links.send).not.toHaveBeenCalled();
  });

  it('404s send-link when the caller tenant does not match the contract', async () => {
    const links = { send: jest.fn() };
    const query = jest.fn(async () => [{ tenant_id: 'ten_b' }]);
    const controller = new BookingContractController(
      { getContract: jest.fn() } as never,
      { get: () => SECRET } as never,
      { query, createQueryRunner: () => ({ connect: async () => undefined, release: async () => undefined, query }) } as never,
      undefined,
      links as never,
    );
    await expect(
      controller.sendSignLink(
        { userId: 'usr_staff', role: 'PROCEDURE_STAFF', tenantId: 'ten_other', email: 'staff@x' },
        'ten_b',
        'ctr_b',
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(links.send).not.toHaveBeenCalled();
  });

  it('refuses otp when the current destination hash does not match the ticket', async () => {
    const sendSms = jest.fn();
    const challenges = new EsignOtpChallengeService(
      { findOne: jest.fn(async () => null), create: jest.fn(), save: jest.fn() } as never,
      linkConfig({ ESIGN_OTP_MAX_ATTEMPTS: '4' }) as never,
    );
    const service = new BookingContractEsignSmsService(
      { findOne: jest.fn(async () => ({ id: 'bkg', leadId: 'ld' })) } as never,
      { findOne: jest.fn(async () => ({ phone: PHONE })) } as never,
      { sendSms } as never,
      { send: jest.fn(), assertReady: jest.fn(), isSandbox: jest.fn(() => true) } as never,
      { append: jest.fn() } as never,
      challenges,
      { resolve: jest.fn() } as never,
      { findOne: jest.fn(async () => ({ channelDestHash: hashChannelDest('0999999999', PEPPER) })) } as never,
      { assertVerified: jest.fn(async () => undefined) } as never,
    );
    await expect(
      service.sendContractOtp('ten_b', 'ctr_b', 'bkg', 'Thu', {
        tenantId: 'ten_b',
        contractId: 'ctr_b',
        buyerId: 'usr_buyer',
        signerId: 'ssgn_1',
        requestId: 'sreq_1',
        jti: 'jti_1',
        channel: 'SMS',
        exp: Date.now() + 60_000,
      }),
    ).rejects.toMatchObject({ response: { detail: 'signer channel destination does not match the ticket' } });
    expect(sendSms).not.toHaveBeenCalled();
  });

  it('refuses production NODE_ENV when the email sandbox flag is on', async () => {
    const { service, enqueue } = harness({
      config: linkConfig({ NODE_ENV: 'production', [ESIGN_LINK_CHANNEL_ENV]: 'EMAIL', EMAIL_SANDBOX: 'true' }),
    });
    await expect(service.send(sendInput)).rejects.toMatchObject({
      response: { detail: 'email sandbox is not allowed in production' },
    });
    expect(enqueue).not.toHaveBeenCalled();
  });
});

describe('email sender fail-closed', () => {
  it('refuses live send when sandbox is empty', async () => {
    const service = new EmailService(
      { findOne: jest.fn(), create: jest.fn(), save: jest.fn() } as never,
      { append: jest.fn() } as never,
      { get: () => undefined } as never,
    );
    expect(() => service.assertReady(EMAIL_TEMPLATES.SIGN_LINK)).toThrow(UnprocessableEntityException);
  });

  it('refuses live credentials when the HTTP relay keys are missing', () => {
    expect(() => assertLiveEmailCredentials(() => undefined)).toThrow(UnprocessableEntityException);
    expect(() =>
      assertLiveEmailCredentials((key) => (key === 'EMAIL_PROVIDER' ? 'smtp' : undefined)),
    ).toThrow(UnprocessableEntityException);
  });
});
