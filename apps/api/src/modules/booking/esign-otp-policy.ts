import { createHmac, timingSafeEqual } from 'crypto';
import { CONTRACT_SIGN_TOKEN_TTL_MS } from './contract-sign-token';
import { ESIGN_DEMO_OTP } from './booking-contract.util';

/** Names only. Empty means refuse. None of these numbers are a signed business limit. */
export const ESIGN_OTP_PEPPER_ENV = 'ESIGN_OTP_PEPPER';
export const ESIGN_OTP_MAX_ATTEMPTS_ENV = 'ESIGN_OTP_MAX_ATTEMPTS';
export const ESIGN_OTP_MAX_SENDS_ENV = 'ESIGN_OTP_MAX_SENDS';
export const ESIGN_OTP_RESEND_COOLDOWN_ENV = 'ESIGN_OTP_RESEND_COOLDOWN_SECONDS';
export const ESIGN_OTP_LOCKOUT_ENV = 'ESIGN_OTP_LOCKOUT_SECONDS';

const BLOCKED_METADATA_KEYS = new Set([
  'otp',
  'token',
  'phone',
  'email',
  'secret',
  'pepper',
  'password',
]);

export function readEsignOtpPepper(read: (key: string) => string | undefined): string | null {
  const pepper = read(ESIGN_OTP_PEPPER_ENV)?.trim() ?? '';
  return pepper.length >= 16 ? pepper : null;
}

/** Positive integer from env. Blank, zero, and non-integers are unconfigured. */
export function readConfiguredPositiveInt(
  read: (key: string) => string | undefined,
  key: string,
): number | null {
  const raw = read(key)?.trim() ?? '';
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

/** HMAC of the ticket jti and the OTP. The same code on another ticket does not match. */
export function hashEsignOtp(otp: string, pepper: string, binding: string): string {
  return createHmac('sha256', pepper).update(`${binding}\n${otp.trim()}`).digest('base64url');
}

export function esignOtpMatches(otp: string, otpHash: string, pepper: string, binding: string): boolean {
  const actual = Buffer.from(hashEsignOtp(otp, pepper, binding));
  const expected = Buffer.from(otpHash);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function maskChannelDest(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes('@')) {
    const [name, domain] = trimmed.split('@');
    const head = name.slice(0, 1);
    return `${head || '*'}***@${domain}`;
  }
  const compact = trimmed.replace(/\s+/g, '');
  if (compact.length <= 4) return '****';
  return `${compact.slice(0, 2)}****${compact.slice(-2)}`;
}

export function hashChannelDest(value: string, pepper: string): string {
  return createHmac('sha256', pepper).update(value.trim().toLowerCase()).digest('base64url');
}

/** OTP lives as long as the existing 15-minute access ticket. A separate OTP TTL is not signed. */
export function esignOtpExpiresAt(now: number): Date {
  return new Date(now + CONTRACT_SIGN_TOKEN_TTL_MS);
}

export function demoEsignOtpRejected(input: {
  otp: string;
  nodeEnv: string | undefined;
  smsSandbox: boolean;
  emailSandbox?: boolean;
  channel?: 'EMAIL' | 'SMS' | 'ZALO';
}): boolean {
  if (input.otp.trim() !== ESIGN_DEMO_OTP) return false;
  if (input.nodeEnv === 'production') return true;
  if (input.channel === 'EMAIL') return input.emailSandbox !== true;
  return !input.smsSandbox;
}

export type EsignOtpView = {
  otpHash: string;
  expiresAtMs: number;
  attempts: number;
  lockedUntilMs: number | null;
  lockedIndefinitely: boolean;
  consumedAtMs: number | null;
};

export type EsignOtpVerifyResult =
  | { ok: true; next: EsignOtpView }
  | { ok: false; reason: string; next: EsignOtpView | null };

export function verifyStoredEsignOtp(input: {
  stored: EsignOtpView | null;
  otp: string;
  now: number;
  pepper: string | null;
  maxAttempts: number | null;
  lockoutSeconds: number | null;
  nodeEnv: string | undefined;
  smsSandbox: boolean;
  emailSandbox?: boolean;
  channel?: 'EMAIL' | 'SMS' | 'ZALO';
  binding?: string;
}): EsignOtpVerifyResult {
  const binding = input.binding ?? 'jti_1';
  if (!input.pepper) {
    return { ok: false, reason: 'esign otp pepper is not configured', next: input.stored };
  }
  if (input.maxAttempts === null) {
    return { ok: false, reason: 'esign otp attempt limit is not configured', next: input.stored };
  }
  if (demoEsignOtpRejected(input)) {
    return { ok: false, reason: 'demo otp is not accepted', next: input.stored };
  }
  const stored = input.stored;
  if (!stored) return { ok: false, reason: 'esign otp challenge is missing', next: null };
  if (stored.consumedAtMs !== null) {
    return { ok: false, reason: 'esign otp challenge was already used', next: stored };
  }
  if (stored.lockedIndefinitely || (stored.lockedUntilMs !== null && stored.lockedUntilMs > input.now)) {
    return { ok: false, reason: 'esign otp challenge is locked', next: stored };
  }
  if (stored.expiresAtMs <= input.now) {
    return { ok: false, reason: 'esign otp challenge is expired', next: stored };
  }
  if (!esignOtpMatches(input.otp, stored.otpHash, input.pepper, binding)) {
    const attempts = stored.attempts + 1;
    const exhausted = attempts >= input.maxAttempts;
    const next: EsignOtpView = {
      ...stored,
      attempts,
      lockedIndefinitely: exhausted && input.lockoutSeconds === null,
      lockedUntilMs:
        exhausted && input.lockoutSeconds !== null ? input.now + input.lockoutSeconds * 1000 : stored.lockedUntilMs,
    };
    return { ok: false, reason: 'esign otp does not match', next };
  }
  return {
    ok: true,
    next: { ...stored, consumedAtMs: input.now },
  };
}

export type ResendDecision = 'first' | 'replay' | 'unconfigured' | 'cooling' | 'ready';

export function decideEsignResend(input: {
  latestCreatedAtMs: number | null;
  latestExpiresAtMs: number | null;
  latestConsumed: boolean;
  now: number;
  cooldownSeconds: number | null;
}): ResendDecision {
  if (input.latestCreatedAtMs === null) return 'first';
  if (
    !input.latestConsumed &&
    input.latestExpiresAtMs !== null &&
    input.latestExpiresAtMs > input.now
  ) {
    return 'replay';
  }
  if (input.cooldownSeconds === null) return 'unconfigured';
  if (input.now < input.latestCreatedAtMs + input.cooldownSeconds * 1000) return 'cooling';
  return 'ready';
}

export function safeSignatureMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (BLOCKED_METADATA_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === 'string' && (value.includes('v1s.') || value.length > 120)) continue;
    safe[key] = value;
  }
  return safe;
}

export function esignOtpSentAudit(input: {
  deliveryId: string;
  bookingId: string;
  phone: string;
  idempotentReplay: boolean;
}): Record<string, unknown> {
  return {
    deliveryId: input.deliveryId,
    bookingId: input.bookingId,
    phoneMasked: maskChannelDest(input.phone),
    idempotentReplay: input.idempotentReplay,
  };
}
