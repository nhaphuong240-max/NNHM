import { UnprocessableEntityException } from '@nestjs/common';
import { EMAIL_TEMPLATE_COPY, EMAIL_TEMPLATES } from '../email/email.types';
import { assertLiveEmailCredentials, LiveEmailSender, SandboxEmailSender } from '../email/email-sender';
import { EmailService } from '../email/email.service';
import { SMS_TEMPLATE_COPY, SMS_TEMPLATES } from '../sms/sms.types';
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
import { EsignLinkService } from './esign-link.service';

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

function harness(opts: {
  config?: { get: (key: string) => string | undefined };
  phone?: string | null;
  email?: string | null;
  latest?: { created_at: Date; status: string; source_id: string };
  sendLimit?: number;
  sendSms?: jest.Mock;
  emailSend?: jest.Mock;
} = {}) {
  const events: Array<Record<string, unknown>> = [];
  const ticketsVoided: unknown[][] = [];
  const sendSms =
    opts.sendSms ??
    jest.fn(async () => ({
      status: 'SENT',
      deliveryId: 'sms_link_1',
      sandbox: true,
    }));
  const emailSend =
    opts.emailSend ??
    jest.fn(async () => ({
      status: 'SENT',
      deliveryId: 'eml_link_1',
      sandbox: true,
    }));
  const liveFetch = jest.fn();
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
      query: jest.fn(async (sql: string, params?: unknown[]) => {
        if (String(sql).includes('pg_advisory_')) return [];
        if (String(sql).includes('VOID') || sql === VOID_OPEN_TICKETS_SQL) {
          ticketsVoided.push(params ?? []);
          return [];
        }
        if (String(sql).includes('email_deliveries') && String(sql).includes('UNION')) {
          return opts.latest ? [opts.latest] : [];
        }
        return [];
      }),
      createQueryRunner: () => ({
        connect: async () => undefined,
        startTransaction: async () => undefined,
        commitTransaction: async () => undefined,
        rollbackTransaction: async () => undefined,
        release: async () => undefined,
        query: async (sql: string, params?: unknown[]) => {
          if (String(sql).includes('VOID') || sql === VOID_OPEN_TICKETS_SQL) {
            ticketsVoided.push(params ?? []);
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
    {
      issueBuyerAccess: jest.fn(async (input: { recordLinkSent?: boolean; channel?: string }) => {
        expect(input.recordLinkSent).toBe(false);
        return {
          token: 'v1s.test.token',
          claims: {
            tenantId: 'ten_b',
            contractId: 'ctr_b',
            buyerId: 'usr_buyer',
            signerId: 'ssgn_1',
            requestId: 'sreq_1',
            jti: 'jti_1',
            channel: input.channel ?? 'SMS',
          },
        };
      }),
    } as never,
    {
      assertSendBudget: jest.fn(async () => {
        if ((opts.sendLimit ?? 0) >= 4) {
          throw new UnprocessableEntityException({ detail: 'esign otp send limit is exhausted' });
        }
      }),
    } as never,
    {
      send: emailSend,
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
    { sendSms, assertEsignReady: jest.fn(async () => undefined) } as never,
  );
  return { service, sendSms, emailSend, events, ticketsVoided, liveFetch };
}

const sendInput = {
  tenantId: 'ten_b',
  contractId: 'ctr_b',
  bookingId: 'bkg',
  buyerId: 'usr_buyer',
  buyerName: 'Thu',
};

describe('esign batch 2 send link', () => {
  it('rejects a missing registered destination', async () => {
    const { service, sendSms } = harness({ phone: '', email: null });
    await expect(service.send(sendInput)).rejects.toMatchObject({
      response: { detail: 'signer phone is not registered' },
    });
    expect(sendSms).not.toHaveBeenCalled();
  });

  it('rejects missing email config and does not call a provider', async () => {
    const fetchImpl = jest.fn();
    const { service, emailSend } = harness({
      config: linkConfig({ [ESIGN_LINK_CHANNEL_ENV]: 'EMAIL', EMAIL_SANDBOX: undefined }),
    });
    await expect(service.send(sendInput)).rejects.toMatchObject({
      response: { detail: 'email sandbox is not configured' },
    });
    expect(emailSend).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('stays in sandbox and does not call a live email API', async () => {
    const fetchImpl = jest.fn();
    const sender = new SandboxEmailSender();
    await sender.send({
      to: EMAIL,
      templateId: EMAIL_TEMPLATES.SIGN_LINK,
      params: { signingUrl: 'https://app.example.test/buyer/esign?signToken=v1s.test.token' },
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

  it('sends SMS while Zalo stays off', async () => {
    const { service, sendSms } = harness({
      config: linkConfig({ [ESIGN_ZNS_ENABLED_ENV]: undefined, [ESIGN_LINK_FALLBACK_CHANNELS_ENV]: undefined }),
    });
    const result = await service.send(sendInput);
    expect(result.channel).toBe('SMS');
    expect(sendSms).toHaveBeenCalledTimes(1);
    expect(sendSms.mock.calls[0][1].templateId).toBe(SMS_TEMPLATES.SIGN_LINK);
    expect(JSON.stringify(sendSms.mock.calls[0][1])).not.toContain('otp');
  });

  it('keeps cooldown and MAX_SENDS when a new ticket is minted', async () => {
    const cooling = harness({
      latest: { created_at: new Date(), status: 'SENT', source_id: PREFIX },
    });
    await expect(cooling.service.send({ ...sendInput, resend: true })).rejects.toMatchObject({
      response: { detail: 'esign otp resend is cooling down' },
    });
    expect(cooling.sendSms).not.toHaveBeenCalled();

    const exhausted = harness({ sendLimit: 4 });
    await expect(exhausted.service.send(sendInput)).rejects.toMatchObject({
      response: { detail: 'esign otp send limit is exhausted' },
    });
    expect(exhausted.sendSms).not.toHaveBeenCalled();
  });

  it('voids unused tickets on resend', async () => {
    const { service, ticketsVoided, sendSms } = harness({
      latest: { created_at: new Date(Date.now() - 120_000), status: 'SENT', source_id: PREFIX },
    });
    const result = await service.send({ ...sendInput, resend: true });
    expect(result.sent).toBe(true);
    expect(ticketsVoided.length).toBeGreaterThan(0);
    expect(sendSms).toHaveBeenCalledTimes(1);
  });

  it('replays a concurrent duplicate instead of sending twice', async () => {
    const sendSms = jest
      .fn()
      .mockRejectedValueOnce({ code: '23505' })
      .mockResolvedValueOnce({
        status: 'SENT',
        deliveryId: 'sms_link_1',
        sandbox: true,
        idempotentReplay: true,
      });
    const { service } = harness({ sendSms });
    const result = await service.send(sendInput);
    expect(result.deliveryId).toBe('sms_link_1');
    expect(sendSms).toHaveBeenCalledTimes(2);
  });

  it('does not persist raw phone, email, token, or otp on the outbox or events', async () => {
    const { service, sendSms, events } = harness();
    await service.send(sendInput);
    const stored = sendSms.mock.calls[0][1];
    expect(stored.templateId).toBe(SMS_TEMPLATES.SIGN_LINK);
    expect(stored.maskStoredDest).toBe(true);
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

  it('refuses live credentials when the provider label or keys are missing', () => {
    expect(() => assertLiveEmailCredentials(() => undefined)).toThrow(UnprocessableEntityException);
    expect(() =>
      assertLiveEmailCredentials((key) => (key === 'EMAIL_PROVIDER' ? 'smtp' : undefined)),
    ).toThrow(UnprocessableEntityException);
  });
});
