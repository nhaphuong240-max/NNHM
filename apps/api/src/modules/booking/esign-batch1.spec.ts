import { readFileSync } from 'fs';
import { join } from 'path';
import { UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { ContractArtifactService } from './contract-artifact.service';
import {
  contractSignSecret,
  mintContractSignToken,
  readContractSignToken,
  CONTRACT_SIGN_TOKEN_TTL_MS,
} from './contract-sign-token';
import { EsignOtpChallengeService } from './esign-otp-challenge.service';
import {
  decideEsignResend,
  demoEsignOtpRejected,
  esignOtpExpiresAt,
  esignOtpSentAudit,
  hashEsignOtp,
  maskChannelDest,
  readConfiguredPositiveInt,
  readEsignOtpPepper,
  safeSignatureMetadata,
  verifyStoredEsignOtp,
  ESIGN_OTP_LOCKOUT_ENV,
  ESIGN_OTP_MAX_ATTEMPTS_ENV,
  ESIGN_OTP_PEPPER_ENV,
  ESIGN_OTP_RESEND_COOLDOWN_ENV,
} from './esign-otp-policy';
import { ESIGN_DEMO_OTP } from './booking-contract.util';
import { SignatureTicketService } from './signature-ticket.service';
import { ticketUse } from './signature-ticket.policy';
import { ESIGN_TENANT_TABLES, buildRemainingRlsStatements } from '../../database/rls/tenant-scoped-tables';

const SECRET = 'contract-sign-test-secret';
const PEPPER = 'esign-otp-pepper-16';
const CODE = '482913';

function claims(now = 1_000) {
  return {
    tenantId: 'ten_b',
    contractId: 'ctr_b',
    buyerId: 'usr_buyer',
    signerId: 'ssgn_1',
    requestId: 'sreq_1',
    jti: 'jti_1',
    channel: 'SMS' as const,
    secret: SECRET,
    now,
  };
}

function stored(hash = hashEsignOtp(CODE, PEPPER), now = 1_000) {
  return {
    otpHash: hash,
    expiresAtMs: now + CONTRACT_SIGN_TOKEN_TTL_MS,
    attempts: 0,
    lockedUntilMs: null,
    lockedIndefinitely: false,
    consumedAtMs: null,
  };
}

describe('esign batch 1 access ticket and otp', () => {
  it('rejects a missing or short contract sign secret and does not read JWT_SECRET', () => {
    expect(contractSignSecret(() => undefined)).toBeNull();
    expect(contractSignSecret(() => 'short')).toBeNull();
    expect(contractSignSecret((key) => (key === 'JWT_SECRET' ? SECRET : undefined))).toBeNull();
    expect(contractSignSecret((key) => (key === 'CONTRACT_SIGN_SECRET' ? SECRET : undefined))).toBe(SECRET);
  });

  it('rejects a tampered, expired, or unbound access ticket', () => {
    const token = mintContractSignToken(claims());
    expect(readContractSignToken(token, SECRET, 1_000)?.jti).toBe('jti_1');
    expect(readContractSignToken(token, SECRET, 1_000 + CONTRACT_SIGN_TOKEN_TTL_MS + 1)).toBeNull();
    const [prefix, body, sig] = token.split('.');
    const flipped = `${sig.slice(0, -1)}${sig.endsWith('a') ? 'b' : 'a'}`;
    expect(readContractSignToken(`${prefix}.${body}.${flipped}`, SECRET, 1_000)).toBeNull();
    const oldBody = Buffer.from(
      JSON.stringify({ tenantId: 'ten_b', contractId: 'ctr_b', buyerId: 'usr_buyer', exp: 10_000 }),
    ).toString('base64url');
    const oldSig = createHmac('sha256', SECRET).update(oldBody).digest('base64url');
    expect(readContractSignToken(`v1s.${oldBody}.${oldSig}`, SECRET, 1_000)).toBeNull();
  });

  it('rejects a consumed access ticket', async () => {
    const open = {
      jti: 'jti_1',
      tenantId: 'ten_b',
      contractId: 'ctr_b',
      signerId: 'ssgn_1',
      requestId: 'sreq_1',
      channel: 'SMS',
      consumedAtMs: null,
    };
    const minted = mintContractSignToken(claims());
    const read = readContractSignToken(minted, SECRET, 1_000);
    expect(read).not.toBeNull();
    expect(ticketUse(open, read!)).toBe('ok');
    expect(ticketUse({ ...open, consumedAtMs: 2_000 }, read!)).toBe('replay');
    expect(ticketUse({ ...open, contractId: 'ctr_other' }, read!)).toBe('mismatch');
    expect(ticketUse(null, read!)).toBe('missing');

    const signer = {
      id: 'ssgn_1',
      requestId: 'sreq_1',
      tenantId: 'ten_b',
      jti: 'jti_1',
      channel: 'SMS',
      jtiConsumedAt: new Date(2_000),
    };
    const service = new SignatureTicketService(
      { findOne: jest.fn(async () => ({ id: 'sreq_1', tenantId: 'ten_b', contractId: 'ctr_b' })) } as never,
      { findOne: jest.fn(async () => signer), update: jest.fn() } as never,
      { save: jest.fn(), create: jest.fn((row) => row) } as never,
    );
    await expect(service.assertUsable(read!)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('stores a hash instead of the raw otp', async () => {
    const saved: Array<{ otpHash?: string }> = [];
    const config = { get: (key: string) => (key === ESIGN_OTP_PEPPER_ENV ? PEPPER : undefined) };
    const challenges = {
      findOne: jest.fn(async () => null),
      create: jest.fn((row) => row),
      save: jest.fn(async (row) => {
        saved.push(row);
        return row;
      }),
    };
    const service = new EsignOtpChallengeService(challenges as never, config as never);
    const minted = readContractSignToken(mintContractSignToken(claims()), SECRET, 1_000);
    await service.issue({ claims: minted!, otp: CODE, now: 1_000 });
    expect(saved[0]?.otpHash).toBe(hashEsignOtp(CODE, PEPPER));
    expect(saved[0]?.otpHash).not.toBe(CODE);
    expect(saved[0]?.otpHash).not.toMatch(/^\d{6}$/);
    expect(JSON.stringify(saved[0])).not.toContain(CODE);
  });

  it('rejects the demo otp outside sandbox and when production is set', () => {
    expect(demoEsignOtpRejected({ otp: ESIGN_DEMO_OTP, nodeEnv: 'production', smsSandbox: true })).toBe(true);
    expect(demoEsignOtpRejected({ otp: ESIGN_DEMO_OTP, nodeEnv: 'development', smsSandbox: false })).toBe(true);
    expect(demoEsignOtpRejected({ otp: ESIGN_DEMO_OTP, nodeEnv: 'development', smsSandbox: true })).toBe(false);
    expect(demoEsignOtpRejected({ otp: CODE, nodeEnv: 'production', smsSandbox: false })).toBe(false);
    const live = verifyStoredEsignOtp({
      stored: stored(hashEsignOtp(ESIGN_DEMO_OTP, PEPPER)),
      otp: ESIGN_DEMO_OTP,
      now: 1_000,
      pepper: PEPPER,
      maxAttempts: 3,
      lockoutSeconds: null,
      nodeEnv: 'production',
      smsSandbox: true,
    });
    expect(live.ok).toBe(false);
    if (!live.ok) expect(live.reason).toBe('demo otp is not accepted');
  });

  it('fails closed when the pepper or attempt limit is missing', () => {
    expect(readEsignOtpPepper(() => undefined)).toBeNull();
    expect(readEsignOtpPepper(() => 'short')).toBeNull();
    expect(readConfiguredPositiveInt(() => undefined, ESIGN_OTP_MAX_ATTEMPTS_ENV)).toBeNull();
    expect(readConfiguredPositiveInt(() => '0', ESIGN_OTP_MAX_ATTEMPTS_ENV)).toBeNull();
    const missingPepper = verifyStoredEsignOtp({
      stored: stored(),
      otp: CODE,
      now: 1_000,
      pepper: null,
      maxAttempts: 3,
      lockoutSeconds: null,
      nodeEnv: 'test',
      smsSandbox: true,
    });
    expect(missingPepper.ok).toBe(false);
    if (!missingPepper.ok) expect(missingPepper.reason).toBe('esign otp pepper is not configured');
    const missingLimit = verifyStoredEsignOtp({
      stored: stored(),
      otp: CODE,
      now: 1_000,
      pepper: PEPPER,
      maxAttempts: null,
      lockoutSeconds: null,
      nodeEnv: 'test',
      smsSandbox: true,
    });
    expect(missingLimit.ok).toBe(false);
    if (!missingLimit.ok) expect(missingLimit.reason).toBe('esign otp attempt limit is not configured');
  });

  it('locks further attempts when the configured limit is exhausted and no lockout duration is set', () => {
    const first = verifyStoredEsignOtp({
      stored: stored(),
      otp: '111111',
      now: 1_000,
      pepper: PEPPER,
      maxAttempts: 1,
      lockoutSeconds: null,
      nodeEnv: 'test',
      smsSandbox: true,
    });
    expect(first.ok).toBe(false);
    if (!first.ok) {
      expect(first.next?.lockedIndefinitely).toBe(true);
      expect(first.next?.attempts).toBe(1);
    }
    const second = verifyStoredEsignOtp({
      stored: first.ok ? stored() : first.next,
      otp: CODE,
      now: 1_100,
      pepper: PEPPER,
      maxAttempts: 1,
      lockoutSeconds: readConfiguredPositiveInt(() => undefined, ESIGN_OTP_LOCKOUT_ENV),
      nodeEnv: 'test',
      smsSandbox: true,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('esign otp challenge is locked');
  });

  it('accepts a matching hash and refuses a resend when cooldown is not configured', () => {
    const matched = verifyStoredEsignOtp({
      stored: stored(),
      otp: CODE,
      now: 1_000,
      pepper: PEPPER,
      maxAttempts: 2,
      lockoutSeconds: null,
      nodeEnv: 'development',
      smsSandbox: true,
    });
    expect(matched.ok).toBe(true);
    if (matched.ok) expect(matched.next.consumedAtMs).toBe(1_000);
    expect(esignOtpExpiresAt(1_000).getTime()).toBe(1_000 + CONTRACT_SIGN_TOKEN_TTL_MS);
    expect(
      decideEsignResend({
        latestCreatedAtMs: null,
        latestExpiresAtMs: null,
        latestConsumed: false,
        now: 1_000,
        cooldownSeconds: null,
      }),
    ).toBe('first');
    expect(
      decideEsignResend({
        latestCreatedAtMs: 1_000,
        latestExpiresAtMs: 1_000 + CONTRACT_SIGN_TOKEN_TTL_MS,
        latestConsumed: false,
        now: 2_000,
        cooldownSeconds: null,
      }),
    ).toBe('replay');
    expect(
      decideEsignResend({
        latestCreatedAtMs: 1_000,
        latestExpiresAtMs: 1_000,
        latestConsumed: true,
        now: 2_000,
        cooldownSeconds: readConfiguredPositiveInt(() => '', ESIGN_OTP_RESEND_COOLDOWN_ENV),
      }),
    ).toBe('unconfigured');
  });

  it('masks the phone and drops otp or token fields from audit metadata', () => {
    const phone = '0900000001';
    const payload = esignOtpSentAudit({
      deliveryId: 'sms_1',
      bookingId: 'bk_1',
      phone,
      idempotentReplay: false,
    });
    expect(JSON.stringify(payload)).not.toContain(phone);
    expect(payload.phoneMasked).toBe(maskChannelDest(phone));
    const metadata = safeSignatureMetadata({ otp: CODE, token: 'v1s.aaa.bbb', deliveryId: 'sms_1' });
    expect(metadata).toEqual({ deliveryId: 'sms_1' });
    expect(JSON.stringify(metadata)).not.toContain(CODE);
  });

  it('keeps provider signature refusal and adds the signing tables under rls', () => {
    const artifacts = new ContractArtifactService({} as never, {} as never);
    expect(() => artifacts.markProviderSigned(undefined)).toThrow(UnprocessableEntityException);
    expect(() => artifacts.markProviderSigned('provider_artifact_1')).toThrow(UnprocessableEntityException);
    const sql = readFileSync(join(__dirname, '../../database/migrations/1758180000000-SignatureAccess.ts'), 'utf8');
    expect(sql).toContain('signature_requests');
    expect(sql).toContain('signature_signers');
    expect(sql).toContain('otp_challenges');
    expect(sql).toContain('signature_events');
    expect(sql).toContain('buildRemainingRlsStatements(ESIGN_TENANT_TABLES)');
    expect(buildRemainingRlsStatements(ESIGN_TENANT_TABLES).join('\n')).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).not.toContain('DROP TABLE "bookings"');
  });
});
