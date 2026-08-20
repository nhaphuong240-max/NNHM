import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/** T3-S1 — Redis leader lock so @Cron jobs run on one pod when HPA > 1 */
@Injectable()
export class ScheduleLeaderService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  async isLeader(lockKey: string, ttlSec = 55): Promise<boolean> {
    if (this.config.get<string>('SCHEDULE_LEADER_ENABLED', 'true') === 'false') {
      return true;
    }

    const pod =
      process.env.HOSTNAME?.trim() ||
      process.env.POD_NAME?.trim() ||
      `pid-${process.pid}`;
    const key = `wereal:schedule:leader:${lockKey}`;

    try {
      const acquired = await this.redis.set(key, pod, 'EX', ttlSec, 'NX');
      if (acquired === 'OK') return true;
      const holder = await this.redis.get(key);
      return holder === pod;
    } catch {
      return true;
    }
  }
}
