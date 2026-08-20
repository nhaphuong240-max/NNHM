import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

/** T7-S2 / H-01 — Redis sliding window rate limit on auth endpoints. */
@Injectable()
export class AuthLoginRateLimitGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.config.get<string>('AUTH_LOGIN_RATE_LIMIT_ENABLED', 'true') === 'false') {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      ip?: string;
      headers: Record<string, string | undefined>;
    }>();

    const handler = context.getHandler().name;
    const routeKey = handler === 'verifyMfa' ? 'mfa' : handler === 'refresh' ? 'refresh' : 'login';
    const limit =
      routeKey === 'mfa'
        ? Number(this.config.get<string>('AUTH_MFA_RATE_LIMIT_PER_MIN', '20')) || 20
        : Number(this.config.get<string>('AUTH_LOGIN_RATE_LIMIT_PER_MIN', '10')) || 10;

    const forwarded = request.headers['x-forwarded-for']?.split(',')[0]?.trim();
    const clientIp = forwarded || request.ip || 'unknown';
    const bucket = Math.floor(Date.now() / 60_000);
    const bucketKey = `wereal:auth:ratelimit:${routeKey}:${clientIp}:${bucket}`;

    const count = await this.redis.incr(bucketKey);
    if (count === 1) {
      await this.redis.expire(bucketKey, 120);
    }
    if (count > limit) {
      throw new HttpException(
        {
          type: 'https://wereal.dev/problems/rate-limit',
          title: 'Too many authentication attempts',
          detail: `Rate limit exceeded for /auth/${routeKey}`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
