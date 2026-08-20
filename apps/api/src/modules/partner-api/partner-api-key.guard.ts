import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.constants';
import { ApiMarketplaceService } from '../api-marketplace/api-marketplace.service';

@Injectable()
export class PartnerApiKeyGuard implements CanActivate {
  constructor(
    private readonly marketplace: ApiMarketplaceService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      partner?: { partnerId: string; rateLimitPerMin: number };
    }>();

    const apiKey = req.headers['x-partner-api-key']?.trim();
    const tenantId = req.headers['x-tenant-id']?.trim();
    if (!apiKey || !tenantId) {
      throw new UnauthorizedException({ detail: 'X-Partner-Api-Key and X-Tenant-Id required' });
    }

    const validated = await this.marketplace.validateApiKey(tenantId, apiKey);
    const limit = validated.rateLimitPerMin ?? 60;
    const bucketKey = `wereal:partner:ratelimit:${tenantId}:${validated.partnerId}:${Math.floor(Date.now() / 60_000)}`;
    const count = await this.redis.incr(bucketKey);
    if (count === 1) await this.redis.expire(bucketKey, 120);
    if (count > limit) {
      throw new HttpException(
        { detail: 'Partner rate limit exceeded' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    req.partner = { partnerId: validated.partnerId, rateLimitPerMin: limit };
    return true;
  }
}
