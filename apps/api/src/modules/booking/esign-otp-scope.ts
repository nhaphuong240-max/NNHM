import { esignOtpMatches } from './esign-otp-policy';

/** One challenge row already limited to a contract and signer. */
export type ScopedChallenge = {
  id: string;
  jti: string;
  attempts: number;
  lockedUntilMs: number | null;
  lockedIndefinitely: boolean;
  consumedAtMs: number | null;
  expiresAtMs: number;
  otpHash: string;
  createdAtMs: number;
};

export type AttemptDecision =
  | { action: 'refuse'; detail: string; lockedEvent: boolean }
  | {
      action: 'update';
      id: string;
      previousAttempts: number;
      attempts: number;
      lockedUntil: Date | null;
      lockedIndefinitely: boolean;
      match: boolean;
      locked: boolean;
    };

/**
 * Attempt budget is the contract and signer, not the ticket.
 * A timed lock that has expired opens a new window. An indefinite lock does not.
 */
export function decideScopedAttempt(input: {
  rows: ScopedChallenge[];
  jti: string;
  now: number;
  maxAttempts: number;
  lockoutSeconds: number | null;
  otp: string;
  pepper: string;
}): AttemptDecision {
  if (input.rows.some((row) => row.lockedIndefinitely)) {
    return { action: 'refuse', detail: 'esign otp challenge is locked', lockedEvent: true };
  }
  if (input.rows.some((row) => row.lockedUntilMs !== null && row.lockedUntilMs > input.now)) {
    return { action: 'refuse', detail: 'esign otp challenge is locked', lockedEvent: true };
  }
  const lockExpired = input.rows.some((row) => row.lockedUntilMs !== null && row.lockedUntilMs <= input.now);
  const spent = lockExpired ? 0 : input.rows.reduce((sum, row) => sum + row.attempts, 0);
  if (!lockExpired && spent >= input.maxAttempts) {
    return { action: 'refuse', detail: 'esign otp challenge is locked', lockedEvent: true };
  }
  const open = input.rows
    .filter((row) => row.jti === input.jti && row.consumedAtMs === null)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)[0];
  if (!open) return { action: 'refuse', detail: 'esign otp challenge is missing', lockedEvent: false };
  if (open.expiresAtMs <= input.now) {
    return { action: 'refuse', detail: 'esign otp challenge is expired', lockedEvent: false };
  }
  const fresh = open.lockedUntilMs !== null && open.lockedUntilMs <= input.now;
  const attempts = fresh ? 1 : open.attempts + 1;
  const exhausted = attempts >= input.maxAttempts || (!lockExpired && spent + 1 >= input.maxAttempts);
  return {
    action: 'update',
    id: open.id,
    previousAttempts: open.attempts,
    attempts,
    lockedUntil:
      exhausted && input.lockoutSeconds !== null ? new Date(input.now + input.lockoutSeconds * 1000) : null,
    lockedIndefinitely: exhausted && input.lockoutSeconds === null,
    match: esignOtpMatches(input.otp, open.otpHash, input.pepper, input.jti),
    locked: exhausted,
  };
}
