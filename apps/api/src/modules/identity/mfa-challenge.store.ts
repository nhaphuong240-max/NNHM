import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

interface StoredMfaChallenge {
  userId: string;
  tenantId: string;
  expiresAt: number;
}

/** In-memory MFA login challenge — replace with Redis in production */
@Injectable()
export class MfaChallengeStore {
  private readonly challenges = new Map<string, StoredMfaChallenge>();

  issue(userId: string, tenantId: string, ttlSeconds: number): string {
    const id = `mfa_${randomBytes(16).toString('hex')}`;
    this.challenges.set(id, {
      userId,
      tenantId,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return id;
  }

  peek(challengeId: string): StoredMfaChallenge | null {
    const entry = this.challenges.get(challengeId);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.challenges.delete(challengeId);
      return null;
    }
    return entry;
  }

  consume(challengeId: string): StoredMfaChallenge | null {
    const entry = this.peek(challengeId);
    if (!entry) return null;
    this.challenges.delete(challengeId);
    return entry;
  }
}
