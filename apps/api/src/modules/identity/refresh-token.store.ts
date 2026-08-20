import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

interface StoredRefreshToken {
  userId: string;
  tenantId: string;
  expiresAt: number;
}

/** In-memory refresh token store — replace with Redis in production */
@Injectable()
export class RefreshTokenStore {
  private readonly tokens = new Map<string, StoredRefreshToken>();

  issue(userId: string, tenantId: string, ttlSeconds: number): string {
    const token = `rt_${randomBytes(24).toString('hex')}`;
    this.tokens.set(token, {
      userId,
      tenantId,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return token;
  }

  consume(token: string): StoredRefreshToken | null {
    const entry = this.tokens.get(token);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.tokens.delete(token);
      return null;
    }
    return entry;
  }

  revoke(token: string): void {
    this.tokens.delete(token);
  }
}
