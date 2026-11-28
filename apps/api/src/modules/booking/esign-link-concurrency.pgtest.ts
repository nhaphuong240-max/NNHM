import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { ADVISORY_LOCK_SQL } from './esign-otp-atomic';
import { EsignLinkService } from './esign-link.service';
import { ESIGN_OTP_MAX_SENDS_ENV, ESIGN_OTP_PEPPER_ENV, ESIGN_OTP_RESEND_COOLDOWN_ENV } from './esign-otp-policy';
import { ESIGN_LINK_CHANNEL_ENV, ESIGN_SIGNING_BASE_URL_ENV } from './esign-link.policy';
import { SandboxEsignOutbox } from './sandbox-esign-outbox';

const url = process.env.DATABASE_URL ?? '';

describe('esign link advisory lock on postgres', () => {
  it('serializes two transactions on the same key and unlocks on commit', async () => {
    if (!url) {
      throw new Error('DATABASE_URL is required for the advisory lock proof');
    }
    const a = new Client({ connectionString: url });
    const b = new Client({ connectionString: url });
    await a.connect();
    await b.connect();
    try {
      await a.query('BEGIN');
      await a.query(ADVISORY_LOCK_SQL, ['esign-link:ten_b:ctr_b:usr_buyer']);
      const started = Date.now();
      let bLocked = false;
      const waiter = (async () => {
        await b.query('BEGIN');
        await b.query(ADVISORY_LOCK_SQL, ['esign-link:ten_b:ctr_b:usr_buyer']);
        bLocked = true;
        await b.query('COMMIT');
      })();
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(bLocked).toBe(false);
      await a.query('COMMIT');
      await waiter;
      expect(bLocked).toBe(true);
      expect(Date.now() - started).toBeGreaterThan(150);
    } finally {
      await a.end();
      await b.end();
    }
  }, 15_000);

  it('lets two concurrent EsignLinkService.send calls mint one ticket and one delivery', async () => {
    if (!url) {
      throw new Error('DATABASE_URL is required for the advisory lock proof');
    }
    const ds = new DataSource({ type: 'postgres', url, extra: { max: 4 } });
    await ds.initialize();
    const deliveries: Array<{ id: string; status: string; source_id: string; created_at: Date }> = [];
    let tickets = 0;
    const enqueue = jest.fn(async () => {
      const id = `sms_${tickets || 1}`;
      deliveries.push({ id, status: 'SENT', source_id: 'ctr_conc:usr_buyer', created_at: new Date() });
      return { status: 'QUEUED', deliveryId: id, sandbox: true };
    });
    const complete = jest.fn(async (_tenant: string, deliveryId: string) => ({
      status: 'SENT',
      deliveryId,
      sandbox: true,
    }));
    const issueBuyerAccess = jest.fn(async () => {
      tickets += 1;
      return {
        token: 'v1s.test.token',
        claims: {
          tenantId: 'ten_conc',
          contractId: 'ctr_conc',
          buyerId: 'usr_buyer',
          signerId: 'ssgn_1',
          requestId: 'sreq_1',
          jti: `jti_${tickets}`,
          channel: 'SMS',
        },
      };
    });
    const service = new EsignLinkService(
      { findOne: jest.fn(async () => ({ id: 'bkg', leadId: 'ld' })) } as never,
      { findOne: jest.fn(async () => ({ phone: '+84901234567', email: 'a@b.c', channelMeta: {} })) } as never,
      { findOne: jest.fn(async () => ({ id: 'usr_buyer' })) } as never,
      {
        query: async () => [],
        createQueryRunner: () => {
          const runner = ds.createQueryRunner();
          const orig = runner.query.bind(runner);
          runner.query = (async (sql: string, params?: unknown[]) => {
            if (String(sql).includes('pg_advisory')) return orig(sql, params);
            if (String(sql).includes('UNION')) {
              return deliveries.slice().sort((a, b) => b.created_at.getTime() - a.created_at.getTime()).slice(0, 1);
            }
            return [];
          }) as typeof runner.query;
          return runner;
        },
        getRepository: () => ({ save: async (row: unknown) => row }),
      } as never,
      {
        get: (key: string) =>
          ({
            CONTRACT_SIGN_SECRET: 'contract-sign-test-secret',
            [ESIGN_OTP_PEPPER_ENV]: 'esign-otp-pepper-16',
            [ESIGN_OTP_MAX_SENDS_ENV]: '4',
            [ESIGN_OTP_RESEND_COOLDOWN_ENV]: '30',
            [ESIGN_LINK_CHANNEL_ENV]: 'SMS',
            [ESIGN_SIGNING_BASE_URL_ENV]: 'https://app.example.test/buyer/esign',
            EMAIL_SANDBOX: 'true',
            SMS_SANDBOX: 'true',
            NODE_ENV: 'test',
          })[key],
      } as never,
      { issueBuyerAccess } as never,
      { assertSendBudget: jest.fn(async () => undefined) } as never,
      { markFailed: jest.fn(), assertReady: jest.fn(), isSandbox: jest.fn(() => true) } as never,
      {
        enqueueEsignLink: enqueue,
        completeEsignLink: complete,
        markFailed: jest.fn(),
        assertEsignReady: jest.fn(async () => undefined),
        isSandbox: jest.fn(async () => true),
      } as never,
      new SandboxEsignOutbox({ get: () => 'test' } as never),
      { assertVerified: jest.fn(async () => undefined) } as never,
    );
    try {
      const input = { tenantId: 'ten_conc', contractId: 'ctr_conc', bookingId: 'bkg', buyerName: 'Thu' };
      const [a, b] = await Promise.all([service.send(input), service.send(input)]);
      expect(new Set([a.deliveryId, b.deliveryId]).size).toBe(1);
      expect(tickets).toBe(1);
      expect(enqueue).toHaveBeenCalledTimes(1);
      expect([a.idempotentReplay, b.idempotentReplay].filter(Boolean)).toHaveLength(1);
    } finally {
      await ds.destroy();
    }
  }, 20_000);
});
