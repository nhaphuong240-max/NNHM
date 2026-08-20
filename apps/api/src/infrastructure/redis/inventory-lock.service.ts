import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { REDIS_CLIENT } from './redis.constants';

export interface LockHolder {
  bookingId: string;
  lockToken: string;
}

export interface InventoryLockMetrics {
  acquired: number;
  contention: number;
}

export type ActiveInventoryLock = {
  unitId: string;
  bookingId: string;
  ttlSeconds: number;
};

const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

@Injectable()
export class InventoryLockService {
  private readonly logger = new Logger(InventoryLockService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  lockKey(tenantId: string, unitId: string): string {
    return `${tenantId}:lock:unit:${unitId}`;
  }

  metricsKey(tenantId: string, metric: 'acquired' | 'contention'): string {
    return `${tenantId}:metrics:inventory_lock:${metric}`;
  }

  /** Atomic SET NX EX — returns lockToken or null if unit already locked */
  async acquireLock(
    tenantId: string,
    unitId: string,
    bookingId: string,
    ttlSeconds: number,
  ): Promise<string | null> {
    const lockToken = randomUUID();
    const key = this.lockKey(tenantId, unitId);
    const value = `${bookingId}|${lockToken}`;
    const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');

    if (result === 'OK') {
      await this.redis.incr(this.metricsKey(tenantId, 'acquired'));
      this.logger.log(
        `inventory_lock acquired tenant=${tenantId} unit=${unitId} booking=${bookingId} ttl=${ttlSeconds}s`,
      );
      return lockToken;
    }

    const holder = await this.getHolder(tenantId, unitId);
    await this.redis.incr(this.metricsKey(tenantId, 'contention'));
    this.logger.warn(
      `inventory_lock contention tenant=${tenantId} unit=${unitId} attempted=${bookingId} holder=${holder?.bookingId ?? 'unknown'}`,
    );
    return null;
  }

  async getHolder(tenantId: string, unitId: string): Promise<LockHolder | null> {
    const raw = await this.redis.get(this.lockKey(tenantId, unitId));
    if (!raw) return null;
    const [bookingId, lockToken] = raw.split('|');
    if (!bookingId || !lockToken) return null;
    return { bookingId, lockToken };
  }

  /** Lua delete only when token matches — prevents wrong release */
  async releaseLock(tenantId: string, unitId: string, lockToken: string): Promise<boolean> {
    const key = this.lockKey(tenantId, unitId);
    const value = await this.redis.get(key);
    if (!value) return false;
    const [, storedToken] = value.split('|');
    if (storedToken !== lockToken) return false;
    const released = await this.redis.eval(RELEASE_SCRIPT, 1, key, value);
    if (released === 1) {
      this.logger.log(`inventory_lock released tenant=${tenantId} unit=${unitId}`);
    }
    return released === 1;
  }

  /** UC-BK-01 · P3-S2 — Redis counters for load-test evidence */
  async getMetrics(tenantId: string): Promise<InventoryLockMetrics> {
    const [acquired, contention] = await Promise.all([
      this.redis.get(this.metricsKey(tenantId, 'acquired')),
      this.redis.get(this.metricsKey(tenantId, 'contention')),
    ]);
    return {
      acquired: Number(acquired ?? 0),
      contention: Number(contention ?? 0),
    };
  }

  /** OPS-S3 — active unit locks + Redis TTL for ops console. */
  async listActiveLocks(tenantId: string): Promise<ActiveInventoryLock[]> {
    const match = `${tenantId}:lock:unit:*`;
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await this.redis.scan(cursor, 'MATCH', match, 'COUNT', 64);
      cursor = String(next);
      keys.push(...batch);
    } while (cursor !== '0');

    const locks: ActiveInventoryLock[] = [];
    for (const key of keys) {
      const raw = await this.redis.get(key);
      const ttl = await this.redis.ttl(key);
      if (!raw) continue;
      const [bookingId] = raw.split('|');
      const unitId = key.split(':lock:unit:')[1];
      if (!bookingId || !unitId) continue;
      locks.push({
        unitId,
        bookingId,
        ttlSeconds: Number(ttl),
      });
    }
    return locks;
  }
}
