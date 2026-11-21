import { ExecutionContext } from '@nestjs/common';
import { ALLOW_CONTRACT_SIGN_TOKEN } from '../../booking/allow-contract-sign-token.decorator';
import { mintContractSignToken } from '../../booking/contract-sign-token';
import { IS_PUBLIC_KEY } from '../identity.types';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('jwt auth guard contract sign bypass', () => {
  const secret = 'contract-sign-test-secret';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function guard(env: Record<string, string | undefined>) {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === ALLOW_CONTRACT_SIGN_TOKEN) return true;
        return false;
      }),
    };
    const config = { get: (key: string) => env[key] };
    return new JwtAuthGuard(reflector as never, config as never);
  }

  function context(token?: string): ExecutionContext {
    return {
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({
        getRequest: () => ({ headers: token ? { 'x-contract-sign-token': token } : {} }),
      }),
    } as unknown as ExecutionContext;
  }

  it('skips JWT for a valid contract sign token and does not reuse JWT_SECRET', async () => {
    const token = mintContractSignToken({
      tenantId: 'ten_b',
      contractId: 'ctr_b',
      buyerId: 'usr_1',
      secret,
    });
    expect(guard({ CONTRACT_SIGN_SECRET: secret }).canActivate(context(token))).toBe(true);

    let skippedJwt = false;
    try {
      const result = guard({ JWT_SECRET: secret }).canActivate(context(token));
      skippedJwt = result === true;
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        await (result as Promise<unknown>).catch(() => undefined);
      }
    } catch {
      skippedJwt = false;
    }
    expect(skippedJwt).toBe(false);
  });
});
