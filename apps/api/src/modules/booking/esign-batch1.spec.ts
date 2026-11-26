import { readFileSync } from 'fs';
import { join } from 'path';
import { UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { BookingContractController } from './booking-contract.controller';
import { BookingContractEsignSmsService } from './booking-contract-esign-sms.service';
import { ContractArtifactService } from './contract-artifact.service';
import { decideScopedAttempt, type ScopedChallenge } from './esign-otp-scope';
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
  esignOtpMatches,
  esignOtpSentAudit,
  hashEsignOtp,
  maskChannelDest,
  readConfiguredPositiveInt,
  readEsignOtpPepper,
  safeSignatureMetadata,
  verifyStoredEsignOtp,
  ESIGN_OTP_LOCKOUT_ENV,
  ESIGN_OTP_MAX_ATTEMPTS_ENV,
  ESIGN_OTP_MAX_SENDS_ENV,
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

function stored(hash = hashEsignOtp(CODE, PEPPER, 'jti_1'), now = 1_000) {
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
    const events: Array<{ action?: string; metadata?: Record<string, unknown> }> = [];
    const config = { get: (key: string) => (key === ESIGN_OTP_PEPPER_ENV ? PEPPER : undefined) };
    const challenges = {
      findOne: jest.fn(async () => null),
      create: jest.fn((row) => row),
      save: jest.fn(async (row) => {
        saved.push(row);
        return row;
      }),
    };
    const eventRepo = {
      create: jest.fn((row) => row),
      save: jest.fn(async (row) => {
        events.push(row);
        return row;
      }),
    };
    const service = new EsignOtpChallengeService(challenges as never, config as never, eventRepo as never);
    const minted = readContractSignToken(mintContractSignToken(claims()), SECRET, 1_000);
    await service.issue({ claims: minted!, otp: CODE, now: 1_000 });
    expect(saved[0]?.otpHash).toBe(hashEsignOtp(CODE, PEPPER, 'jti_1'));
    expect(saved[0]?.otpHash).not.toBe(CODE);
    expect(saved[0]?.otpHash).not.toMatch(/^\d{6}$/);
    expect(JSON.stringify(saved[0])).not.toContain(CODE);
    expect(esignOtpMatches(CODE, saved[0]?.otpHash ?? '', PEPPER, 'jti_other')).toBe(false);
    expect(events[0]?.action).toBe('OTP_SENT');
    expect(JSON.stringify(events[0]?.metadata)).not.toContain(CODE);
  });

  it('rejects the demo otp outside sandbox and when production is set', () => {
    expect(demoEsignOtpRejected({ otp: ESIGN_DEMO_OTP, nodeEnv: 'production', smsSandbox: true })).toBe(true);
    expect(demoEsignOtpRejected({ otp: ESIGN_DEMO_OTP, nodeEnv: 'development', smsSandbox: false })).toBe(true);
    expect(demoEsignOtpRejected({ otp: ESIGN_DEMO_OTP, nodeEnv: 'development', smsSandbox: true })).toBe(false);
    expect(demoEsignOtpRejected({ otp: CODE, nodeEnv: 'production', smsSandbox: false })).toBe(false);
    const live = verifyStoredEsignOtp({
      stored: stored(hashEsignOtp(ESIGN_DEMO_OTP, PEPPER, 'jti_1')),
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

  it('rejects a claim that names another contract, signer, or request', async () => {
    const config = { get: (key: string) => (key === 'CONTRACT_SIGN_SECRET' ? SECRET : undefined) };
    const dataSource = {
      createQueryRunner: () => ({
        connect: async () => undefined,
        release: async () => undefined,
        query: async () => [{ tenant_id: 'ten_b' }],
      }),
    };
    const token = mintContractSignToken(claims());
    const contracts = {
      getSignSession: jest.fn(),
      getContract: jest.fn(),
      signContract: jest.fn(),
    };
    const mismatched = (signerId: string, requestId: string) =>
      new SignatureTicketService(
        { findOne: jest.fn(async () => ({ id: requestId, tenantId: 'ten_b', contractId: 'ctr_b' })) } as never,
        {
          findOne: jest.fn(async () => ({
            id: signerId,
            requestId,
            tenantId: 'ten_b',
            jti: 'jti_1',
            channel: 'SMS',
            jtiConsumedAt: null,
          })),
        } as never,
        { save: jest.fn(), create: jest.fn((row) => row) } as never,
      );
    const rejectAll = async (controller: BookingContractController) => {
      await expect(controller.signSession('ten_b', token, 'ctr_b')).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(controller.detail('ten_b', token, 'ctr_b')).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(
        controller.sign('ten_b', token, 'ctr_b', { signerName: 'Thu', otp: CODE, consent: true }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(contracts.getSignSession).not.toHaveBeenCalled();
      expect(contracts.getContract).not.toHaveBeenCalled();
      expect(contracts.signContract).not.toHaveBeenCalled();
    };
    const otherContract = new BookingContractController(
      contracts as never,
      config as never,
      dataSource as never,
      mismatched('ssgn_1', 'sreq_1'),
    );
    await expect(otherContract.signSession('ten_b', token, 'ctr_other')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(otherContract.detail('ten_b', token, 'ctr_other')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      otherContract.sign('ten_b', token, 'ctr_other', { signerName: 'Thu', otp: CODE, consent: true }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await rejectAll(
      new BookingContractController(contracts as never, config as never, dataSource as never, mismatched('ssgn_other', 'sreq_1')),
    );
    await rejectAll(
      new BookingContractController(contracts as never, config as never, dataSource as never, mismatched('ssgn_1', 'sreq_other')),
    );
  });
});

type MemChallenge = {
  id: string;
  jti: string;
  tenantId: string;
  contractId: string;
  subjectId: string;
  otp_hash: string;
  attempts: number;
  locked_until: string | null;
  locked_indefinitely: boolean;
  consumed_at: string | null;
  expires_at: string;
  created_at: string;
};

function gateConfig(max: string, lockout?: string, extra: Record<string, string> = {}) {
  return {
    get: (key: string) => {
      if (key === ESIGN_OTP_PEPPER_ENV) return PEPPER;
      if (key === ESIGN_OTP_MAX_ATTEMPTS_ENV) return max;
      if (key === ESIGN_OTP_LOCKOUT_ENV) return lockout;
      if (key === 'NODE_ENV') return 'test';
      return extra[key];
    },
  };
}

function seedChallenge(overrides: Partial<MemChallenge> = {}): MemChallenge {
  return {
    id: 'otp_1',
    jti: 'jti_1',
    tenantId: 'ten_b',
    contractId: 'ctr_b',
    subjectId: 'usr_buyer',
    otp_hash: hashEsignOtp(CODE, PEPPER, 'jti_1'),
    attempts: 0,
    locked_until: null,
    locked_indefinitely: false,
    consumed_at: null,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function applySql(state: { challenges: MemChallenge[]; signers: Array<{ jti: string; tenantId: string; consumed: boolean }> }, sql: string, params: unknown[]) {
  if (sql.includes('FOR UPDATE')) {
    const [tenantId, contractId, subjectId] = params as string[];
    return state.challenges
      .filter((row) => row.tenantId === tenantId && row.contractId === contractId && row.subjectId === subjectId)
      .map((row) => ({ ...row }));
  }
  if (sql.includes('SET "attempts"')) {
    const [id, attempts, lockedUntil, lockedIndefinitely, tenantId, maxAttempts, previousAttempts] = params;
    const row = state.challenges.find((item) => item.id === id && item.tenantId === tenantId);
    const lockedMs = row?.locked_until ? new Date(row.locked_until).getTime() : null;
    const lockOpen = lockedMs === null || lockedMs <= Date.now();
    const underLimit = !!row && (row.attempts < Number(maxAttempts) || (lockedMs !== null && lockedMs <= Date.now()));
    if (!row || row.consumed_at || row.locked_indefinitely || !lockOpen || !underLimit || row.attempts !== previousAttempts) {
      return [];
    }
    row.attempts = Number(attempts);
    row.locked_until = lockedUntil instanceof Date ? lockedUntil.toISOString() : ((lockedUntil as string | null) ?? null);
    row.locked_indefinitely = Boolean(lockedIndefinitely);
    return [{ id: row.id }];
  }
  if (sql.includes('jti_consumed_at')) {
    const [jti, tenantId] = params as string[];
    const row = state.signers.find((item) => item.jti === jti && item.tenantId === tenantId && !item.consumed);
    if (!row) return [];
    row.consumed = true;
    return [{ id: 'ssgn_1' }];
  }
  if (sql.includes('consumed_at')) {
    const [id, tenantId] = params as string[];
    const row = state.challenges.find((item) => item.id === id && item.tenantId === tenantId && !item.consumed_at);
    if (!row) return [];
    row.consumed_at = new Date().toISOString();
    return [{ id: row.id }];
  }
  return [];
}

function serialDb(challenge: MemChallenge) {
  const state = {
    challenges: [{ ...challenge }],
    signers: [{ jti: challenge.jti, tenantId: challenge.tenantId, consumed: false }],
    events: [] as Array<{ action: string; metadata?: Record<string, unknown> }>,
  };
  let gate = Promise.resolve();
  const acquire = () => {
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const wait = gate;
    gate = gate.then(() => next);
    return wait.then(() => release);
  };
  return {
    state,
    createQueryRunner() {
      let release: (() => void) | null = null;
      let snap: typeof state | null = null;
      let finished = false;
      const finish = (restore: boolean) => {
        if (finished) return;
        finished = true;
        if (restore && snap) {
          state.challenges = snap.challenges;
          state.signers = snap.signers;
          state.events = snap.events;
        }
        release?.();
      };
      return {
        connect: async () => undefined,
        startTransaction: async () => {
          release = await acquire();
          snap = {
            challenges: state.challenges.map((row) => ({ ...row })),
            signers: state.signers.map((row) => ({ ...row })),
            events: state.events.map((row) => ({ ...row })),
          };
        },
        commitTransaction: async () => finish(false),
        rollbackTransaction: async () => finish(true),
        release: async () => undefined,
        query: async (sql: string, params: unknown[] = []) => applySql(state, sql, params),
        manager: {
          getRepository: () => ({
            create: (row: { action: string; metadata?: Record<string, unknown> }) => row,
            save: async (row: { action: string; metadata?: Record<string, unknown> }) => {
              state.events.push(row);
              return row;
            },
          }),
        },
      };
    },
  };
}

function accessClaims() {
  return readContractSignToken(mintContractSignToken(claims()), SECRET, 1_000)!;
}

function gate(max: string, lockout: string | undefined, challenge: MemChallenge) {
  const db = serialDb(challenge);
  const challenges = new EsignOtpChallengeService({} as never, gateConfig(max, lockout) as never);
  const tickets = new SignatureTicketService({} as never, {} as never, {} as never, db as never, challenges);
  return { db, tickets };
}

describe('e-sign atomic consume', () => {
  it('does not consume the ticket when the otp is wrong', async () => {
    const { db, tickets } = gate('2', undefined, seedChallenge());
    await expect(tickets.completeSign(accessClaims(), '111111', async () => 'signed')).rejects.toMatchObject({
      response: { detail: 'Invalid OTP' },
    });
    expect(db.state.signers[0]?.consumed).toBe(false);
    expect(db.state.challenges[0]?.consumed_at).toBeNull();
    expect(db.state.challenges[0]?.attempts).toBe(1);
    expect(db.state.events.some((event) => event.action === 'OTP_FAILED')).toBe(true);
    expect(JSON.stringify(db.state.events)).not.toContain(CODE);
  });

  it('keeps parallel wrong attempts inside the configured limit', async () => {
    const { db, tickets } = gate('2', undefined, seedChallenge());
    const attempts = await Promise.allSettled(
      [0, 1, 2, 3].map(() => tickets.completeSign(accessClaims(), '111111', async () => 'signed')),
    );
    expect(attempts.every((item) => item.status === 'rejected')).toBe(true);
    expect(db.state.challenges[0]?.attempts).toBe(2);
    expect(db.state.signers[0]?.consumed).toBe(false);
  });

  it('lets only one of two concurrent correct otps sign', async () => {
    const { db, tickets } = gate('3', undefined, seedChallenge());
    const results = await Promise.allSettled([
      tickets.completeSign(accessClaims(), CODE, async () => 'signed'),
      tickets.completeSign(accessClaims(), CODE, async () => 'signed'),
    ]);
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(db.state.signers[0]?.consumed).toBe(true);
    expect(db.state.challenges[0]?.consumed_at).not.toBeNull();
  });

  it('rolls the claim back when signing fails', async () => {
    const { db, tickets } = gate('3', undefined, seedChallenge());
    await expect(
      tickets.completeSign(accessClaims(), CODE, async () => {
        throw new Error('vault');
      }),
    ).rejects.toThrow('vault');
    expect(db.state.signers[0]?.consumed).toBe(false);
    expect(db.state.challenges[0]?.consumed_at).toBeNull();
    expect(db.state.challenges[0]?.attempts).toBe(0);
  });

  it('locks for the configured duration and allows an attempt after it expires', async () => {
    const { db, tickets } = gate('1', '60', seedChallenge());
    await expect(tickets.completeSign(accessClaims(), '111111', async () => 'signed')).rejects.toMatchObject({
      response: { detail: 'Invalid OTP' },
    });
    expect(db.state.challenges[0]?.locked_until).not.toBeNull();
    expect(db.state.signers[0]?.consumed).toBe(false);
    await expect(tickets.completeSign(accessClaims(), CODE, async () => 'signed')).rejects.toMatchObject({
      response: { detail: 'esign otp challenge is locked' },
    });
    db.state.challenges[0]!.locked_until = new Date(Date.now() - 1_000).toISOString();
    await expect(tickets.completeSign(accessClaims(), CODE, async () => 'signed')).resolves.toBe('signed');
    expect(db.state.signers[0]?.consumed).toBe(true);
  });

  it('does not reset the attempt budget when a new ticket is opened', () => {
    const row = (jti: string, attempts: number, lockedUntilMs: number | null): ScopedChallenge => ({
      id: jti,
      jti,
      attempts,
      lockedUntilMs,
      lockedIndefinitely: false,
      consumedAtMs: null,
      expiresAtMs: 5_000,
      otpHash: hashEsignOtp(CODE, PEPPER, jti),
      createdAtMs: 1_000,
    });
    const blocked = decideScopedAttempt({
      rows: [row('jti_old', 2, null), row('jti_new', 0, null)],
      jti: 'jti_new',
      now: 2_000,
      maxAttempts: 2,
      lockoutSeconds: null,
      otp: CODE,
      pepper: PEPPER,
    });
    expect(blocked.action).toBe('refuse');
    const during = decideScopedAttempt({
      rows: [row('jti_1', 1, 3_000)],
      jti: 'jti_1',
      now: 2_000,
      maxAttempts: 1,
      lockoutSeconds: 1,
      otp: CODE,
      pepper: PEPPER,
    });
    expect(during.action).toBe('refuse');
    const after = decideScopedAttempt({
      rows: [row('jti_1', 1, 1_500)],
      jti: 'jti_1',
      now: 2_000,
      maxAttempts: 1,
      lockoutSeconds: 1,
      otp: CODE,
      pepper: PEPPER,
    });
    expect(after.action).toBe('update');
  });
});

describe('e-sign sms send gate', () => {
  const access = accessClaims();

  function smsHarness(config: { get: (key: string) => string | undefined }, latest: unknown, dataSource?: { query: () => Promise<unknown[]> }) {
    const sendSms = jest.fn(async () => ({ otp: CODE, deliveryId: 'sms_1', sandbox: true }));
    const saved: unknown[] = [];
    const challenges = new EsignOtpChallengeService(
      {
        findOne: jest.fn(async () => latest),
        create: jest.fn((row) => row),
        save: jest.fn(async (row) => {
          saved.push(row);
          return row;
        }),
      } as never,
      config as never,
      undefined,
      dataSource as never,
    );
    const service = new BookingContractEsignSmsService(
      { findOne: jest.fn(async () => ({ id: 'bkg', leadId: 'ld' })) } as never,
      { findOne: jest.fn(async () => ({ phone: '0900000001' })) } as never,
      { sendSms } as never,
      { append: jest.fn() } as never,
      challenges,
      { resolve: jest.fn() } as never,
    );
    return { service, sendSms, saved };
  }

  it('does not send sms when the pepper is missing', async () => {
    const { service, sendSms } = smsHarness({ get: () => undefined }, null);
    await expect(service.sendContractOtp('ten_b', 'ctr_b', 'bkg', 'Thu', access)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(sendSms).not.toHaveBeenCalled();
  });

  it('reports a replay only when an open challenge exists and does not send', async () => {
    const { service, sendSms } = smsHarness(gateConfig('3'), {
      id: 'otp_open',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });
    const result = await service.sendContractOtp('ten_b', 'ctr_b', 'bkg', 'Thu', access);
    expect(result.sent).toBe(true);
    expect(result.idempotentReplay).toBe(true);
    expect(sendSms).not.toHaveBeenCalled();
  });

  it('refuses a resend when cooldown is not configured and does not send', async () => {
    const { service, sendSms } = smsHarness(gateConfig('3'), {
      id: 'otp_old',
      createdAt: new Date(Date.now() - 120_000),
      expiresAt: new Date(Date.now() - 60_000),
      consumedAt: new Date(),
    });
    await expect(service.sendContractOtp('ten_b', 'ctr_b', 'bkg', 'Thu', access)).rejects.toMatchObject({
      response: { detail: 'esign otp resend cooldown is not configured' },
    });
    expect(sendSms).not.toHaveBeenCalled();
  });

  it('issues a new otp on resend and invalidates the previous one', async () => {
    const previous = {
      id: 'otp_old',
      createdAt: new Date(Date.now() - 120_000),
      expiresAt: new Date(Date.now() - 60_000),
      consumedAt: new Date(),
    };
    const { service, sendSms, saved } = smsHarness(
      gateConfig('3', undefined, { [ESIGN_OTP_RESEND_COOLDOWN_ENV]: '30', [ESIGN_OTP_MAX_SENDS_ENV]: '2' }),
      previous,
      { query: async () => [{ sends: 0 }] },
    );
    const result = await service.sendContractOtp('ten_b', 'ctr_b', 'bkg', 'Thu', access);
    expect(result.sent).toBe(true);
    expect(sendSms).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(saved)).not.toContain(CODE);
    expect(saved.some((row) => (row as { otpHash?: string }).otpHash)).toBe(true);
  });
});
