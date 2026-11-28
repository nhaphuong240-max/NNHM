import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/** T3-S1 — Redis leader lock so @Cron jobs run on one pod when HPA > 1 */
@Injectable()
export class ScheduleLeaderService {
  private readonly logger = new Logger(ScheduleLeaderService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  private podName(): string {
    return process.env.HOSTNAME?.trim() || process.env.POD_NAME?.trim() || `pid-${process.pid}`;
  }

  private keyFor(lockKey: string): string {
    return `wereal:schedule:leader:${lockKey}`;
  }

  private leaderDisabled(): boolean {
    return this.config.get<string>('SCHEDULE_LEADER_ENABLED', 'true') === 'false';
  }

  /**
   * Fail-closed: Redis errors skip the tick so two pods do not both run.
   * When this pod already holds the key, the TTL is renewed so a long job cannot overlap.
   */
  async isLeader(lockKey: string, ttlSec = 55): Promise<boolean> {
    if (this.leaderDisabled()) {
      return true;
    }

    const pod = this.podName();
    const key = this.keyFor(lockKey);

    try {
      const acquired = await this.redis.set(key, pod, 'EX', ttlSec, 'NX');
      if (acquired === 'OK') return true;
      const holder = await this.redis.get(key);
      if (holder !== pod) return false;
      await this.redis.expire(key, ttlSec);
      return true;
    } catch (error) {
      this.logger.warn(
        `schedule leader redis failed; skipping tick lock=${lockKey} err=${error instanceof Error ? error.message : 'unknown'}`,
      );
      return false;
    }
  }

  async renewLeader(lockKey: string, ttlSec: number): Promise<boolean> {
    if (this.leaderDisabled()) {
      return true;
    }
    const pod = this.podName();
    const key = this.keyFor(lockKey);
    try {
      const holder = await this.redis.get(key);
      if (holder !== pod) return false;
      const extended = await this.redis.expire(key, ttlSec);
      return extended === 1;
    } catch (error) {
      this.logger.warn(
        `schedule leader renew failed; skipping remaining work lock=${lockKey} err=${error instanceof Error ? error.message : 'unknown'}`,
      );
      return false;
    }
  }
}
