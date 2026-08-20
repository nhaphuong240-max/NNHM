import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthLoginRateLimitGuard } from './auth-login-rate-limit.guard';

describe('AuthLoginRateLimitGuard', () => {
  const redis = {
    incr: jest.fn(),
    expire: jest.fn(),
  };

  const config = {
    get: jest.fn((key: string, def?: string) => {
      if (key === 'AUTH_LOGIN_RATE_LIMIT_ENABLED') return 'true';
      if (key === 'AUTH_LOGIN_RATE_LIMIT_PER_MIN') return '2';
      return def;
    }),
  };

  const guard = new AuthLoginRateLimitGuard(config as unknown as ConfigService, redis as never);

  const context = (handlerName: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '127.0.0.1',
          headers: {},
        }),
      }),
      getHandler: () => ({ name: handlerName }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    redis.incr.mockReset();
    redis.expire.mockReset();
  });

  it('allows requests under limit', async () => {
    redis.incr.mockResolvedValue(1);
    await expect(guard.canActivate(context('login'))).resolves.toBe(true);
  });

  it('throws 429 when limit exceeded', async () => {
    redis.incr.mockResolvedValue(3);
    await expect(guard.canActivate(context('login'))).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('skips when disabled', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'AUTH_LOGIN_RATE_LIMIT_ENABLED') return 'false';
      return undefined;
    });
    await expect(guard.canActivate(context('login'))).resolves.toBe(true);
    expect(redis.incr).not.toHaveBeenCalled();
  });
});
