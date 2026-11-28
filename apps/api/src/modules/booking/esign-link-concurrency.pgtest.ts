import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SignatureEventEntity } from '../../database/entities/signature-event.entity';
import { SignatureRequestEntity } from '../../database/entities/signature-request.entity';
import { SignatureSignerEntity } from '../../database/entities/signature-signer.entity';
import { SignerChannelVerificationEntity } from '../../database/entities/signer-channel-verification.entity';
import { SmsDeliveryEntity } from '../../database/entities/sms-delivery.entity';
import { ADVISORY_LOCK_SQL } from './esign-otp-atomic';
import { EsignLinkService } from './esign-link.service';
import { SignerChannelVerificationService } from './signer-channel-verification.service';
import { ESIGN_OTP_PEPPER_ENV, ESIGN_OTP_RESEND_COOLDOWN_ENV } from './esign-otp-policy';
import { ESIGN_LINK_CHANNEL_ENV, ESIGN_SIGNING_BASE_URL_ENV } from './esign-link.policy';
import { SandboxEsignOutbox } from './sandbox-esign-outbox';
import { SignatureTicketService } from './signature-ticket.service';
import { SmsService } from '../sms/sms.service';

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
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
    const tenantId = `ten_${stamp}`.slice(0, 32);
    const contractId = `ctr_${stamp}`.slice(0, 32);
    const bookingId = `bkg_${stamp}`.slice(0, 32);
    const buyerId = `usr_${stamp}`.slice(0, 32);
    const ds = new DataSource({
      type: 'postgres',
      url,
      entities: [SmsDeliveryEntity, SignatureRequestEntity, SignatureSignerEntity, SignatureEventEntity],
      extra: { max: 4 },
    });
    await ds.initialize();
    await ds.query(`SELECT set_config('app.is_platform_admin', 'true', false)`);
    const config = {
      get: (key: string) =>
        ({
          CONTRACT_SIGN_SECRET: 'contract-sign-test-secret',
          [ESIGN_OTP_PEPPER_ENV]: 'esign-otp-pepper-16',
          [ESIGN_OTP_RESEND_COOLDOWN_ENV]: '30',
          [ESIGN_LINK_CHANNEL_ENV]: 'SMS',
          [ESIGN_SIGNING_BASE_URL_ENV]: 'https://app.example.test/buyer/esign',
          EMAIL_SANDBOX: 'true',
          SMS_SANDBOX: 'true',
          NODE_ENV: 'test',
        })[key],
    };
    const tickets = new SignatureTicketService(
      ds.getRepository(SignatureRequestEntity),
      ds.getRepository(SignatureSignerEntity),
      ds.getRepository(SignatureEventEntity),
      ds,
    );
    const sms = new SmsService(
      ds.getRepository(SmsDeliveryEntity),
      { findOne: jest.fn(async () => ({ id: 'smb', isActive: true, apiKey: 'k' })) } as never,
      { isSandboxMode: jest.fn(async () => true), graphMode: jest.fn(async () => 'SANDBOX') } as never,
      { append: jest.fn(async () => ({})) } as never,
      config as never,
      { resolve: jest.fn(async () => ({ smsSandbox: true })) } as never,
    );
    const service = new EsignLinkService(
      { findOne: jest.fn(async () => ({ id: bookingId, leadId: 'ld_conc' })) } as never,
      { findOne: jest.fn(async () => ({ phone: '+84901234567', email: 'a@b.c', channelMeta: {} })) } as never,
      { findOne: jest.fn(async () => ({ id: buyerId })) } as never,
      ds,
      config as never,
      tickets,
      { assertSendBudget: jest.fn(async () => undefined) } as never,
      { markFailed: jest.fn(), assertReady: jest.fn(), isSandbox: jest.fn(() => true) } as never,
      sms,
      new SandboxEsignOutbox({ get: () => 'test' } as never),
      { assertVerified: jest.fn(async () => undefined) } as never,
    );
    try {
      const input = { tenantId, contractId, bookingId, buyerName: 'Thu' };
      const [a, b] = await Promise.all([service.send(input), service.send(input)]);
      expect(new Set([a.deliveryId, b.deliveryId]).size).toBe(1);
      expect([a.idempotentReplay, b.idempotentReplay].filter(Boolean)).toHaveLength(1);
      const deliveries = (await ds.query(
        `SELECT id FROM sms_deliveries WHERE tenant_id = $1 AND source_type = 'ESIGN_LINK'`,
        [tenantId],
      )) as Array<{ id: string }>;
      const signers = (await ds.query(`SELECT id FROM signature_signers WHERE tenant_id = $1`, [tenantId])) as Array<{
        id: string;
      }>;
      expect(deliveries).toHaveLength(1);
      expect(signers).toHaveLength(1);
    } finally {
      await ds.query(`DELETE FROM signature_events WHERE tenant_id = $1`, [tenantId]);
      await ds.query(`DELETE FROM signature_signers WHERE tenant_id = $1`, [tenantId]);
      await ds.query(`DELETE FROM signature_requests WHERE tenant_id = $1`, [tenantId]);
      await ds.query(`DELETE FROM sms_deliveries WHERE tenant_id = $1`, [tenantId]);
      await ds.destroy();
    }
  }, 20_000);

  it('lets only one of two parallel channel-verify starts send', async () => {
    if (!url) {
      throw new Error('DATABASE_URL is required for the advisory lock proof');
    }
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
    const tenantId = `ten_${stamp}`.slice(0, 32);
    const leadId = `ld_${stamp}`.slice(0, 32);
    const ds = new DataSource({
      type: 'postgres',
      url,
      entities: [LeadEntity, SignerChannelVerificationEntity],
      extra: { max: 4 },
    });
    await ds.initialize();
    await ds.query(`SELECT set_config('app.is_platform_admin', 'true', false)`);
    await ds.query(
      `INSERT INTO leads (id, tenant_id, full_name, phone, email, source, tier)
       VALUES ($1, $2, 'Thu', '+84901234567', 'a@b.c', 'WEB', 'NEW')`,
      [leadId, tenantId],
    );
    const send = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      return { status: 'SENT', deliveryId: 'eml_1', sandbox: true };
    });
    const svc = new SignerChannelVerificationService(
      ds.getRepository(LeadEntity),
      ds.getRepository(SignerChannelVerificationEntity),
      { send, assertReady: jest.fn(), isSandbox: jest.fn(() => true) } as never,
      {
        get: (key: string) =>
          ({
            [ESIGN_OTP_PEPPER_ENV]: 'esign-otp-pepper-16',
            [ESIGN_OTP_RESEND_COOLDOWN_ENV]: '30',
            EMAIL_SANDBOX: 'true',
            NODE_ENV: 'test',
          })[key],
      } as never,
    );
    try {
      const settled = await Promise.allSettled([svc.start(tenantId, '0901234567'), svc.start(tenantId, '0901234567')]);
      const sent = settled.filter((item) => item.status === 'fulfilled');
      const closed = settled.filter(
        (item) =>
          item.status === 'rejected' &&
          (item.reason as { response?: { detail?: string } })?.response?.detail ===
            'signer channel destination is not registered',
      );
      expect(sent).toHaveLength(1);
      expect(closed).toHaveLength(1);
      expect(send).toHaveBeenCalledTimes(1);
    } finally {
      await ds.query(`DELETE FROM signer_channel_verifications WHERE tenant_id = $1`, [tenantId]);
      await ds.query(`DELETE FROM leads WHERE tenant_id = $1`, [tenantId]);
      await ds.destroy();
    }
  }, 20_000);
});
