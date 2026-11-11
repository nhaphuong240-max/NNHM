import { ExecutionContext, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PUBLIC_TOKEN_LOOKUP_SQL, lookupTenantByPublicToken } from './public-tenant-lookup';
import { PublicTokenTenantGuard } from './public-token-tenant.guard';
import { mintPublicTenantToken } from './public-tenant-token';

type Stored = { token: string; tenant_id: string };

function matches(stored: string, raw: string, secret: string): boolean {
  if (stored === raw || stored === secret) return true;
  if (!secret) return false;
  const parts = stored.split('.');
  return parts[0] === 'v1' && parts[2] === secret;
}

function dataSourceWith(rows: Stored[]): DataSource {
  return {
    createQueryRunner: () => ({
      connect: async () => undefined,
      release: async () => undefined,
      query: async (sql: string, params: string[]) => {
        if (/like/i.test(sql)) throw new Error('token lookup must not use LIKE');
        const [raw, secret] = params;
        return rows
          .filter((row) => matches(row.token, raw, secret))
          .map((row) => ({ tenant_id: row.tenant_id }));
      },
    }),
  } as unknown as DataSource;
}

function contextFor(token: string, header?: string): ExecutionContext {
  const request = {
    params: { token },
    body: {},
    headers: header ? { 'x-tenant-id': header } : {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('public token tenant lookup', () => {
  const stored = mintPublicTenantToken('ten_owner_a', 'goodsecret');

  beforeEach(() => {
    delete process.env.PUBLIC_CATALOG_TOKEN;
  });

  it('matches a prefixed token and a bare secret, and does not treat wildcards as patterns', async () => {
    expect(PUBLIC_TOKEN_LOOKUP_SQL.toLowerCase()).not.toContain('like');
    expect(PUBLIC_TOKEN_LOOKUP_SQL).toContain("split_part(token, '.', 3) = $2");
    const source = dataSourceWith([{ token: stored, tenant_id: 'ten_owner_a' }]);
    await expect(lookupTenantByPublicToken(source, stored)).resolves.toEqual(['ten_owner_a']);
    await expect(lookupTenantByPublicToken(source, 'goodsecret')).resolves.toEqual(['ten_owner_a']);
    await expect(lookupTenantByPublicToken(source, '%')).resolves.toEqual([]);
    await expect(lookupTenantByPublicToken(source, '_')).resolves.toEqual([]);
    await expect(lookupTenantByPublicToken(source, 'a%')).resolves.toEqual([]);
    await expect(lookupTenantByPublicToken(source, 'wrongsecret')).resolves.toEqual([]);
  });

  it('returns every tenant when the same secret is stored twice', async () => {
    const source = dataSourceWith([
      { token: stored, tenant_id: 'ten_owner_a' },
      { token: mintPublicTenantToken('ten_owner_b', 'goodsecret'), tenant_id: 'ten_owner_b' },
    ]);
    await expect(lookupTenantByPublicToken(source, 'goodsecret')).resolves.toEqual([
      'ten_owner_a',
      'ten_owner_b',
    ]);
  });
});

describe('PublicTokenTenantGuard', () => {
  const stored = mintPublicTenantToken('ten_owner_a', 'goodsecret');

  beforeEach(() => {
    delete process.env.PUBLIC_CATALOG_TOKEN;
  });

  function guard(rows: Stored[]) {
    return new PublicTokenTenantGuard(dataSourceWith(rows));
  }

  async function detail(error: unknown): Promise<string> {
    expect(error).toBeInstanceOf(UnprocessableEntityException);
    const response = (error as UnprocessableEntityException).getResponse() as { detail?: string };
    return response.detail ?? '';
  }

  it('accepts a new token and a bare token', async () => {
    const rows = [{ token: stored, tenant_id: 'ten_owner_a' }];
    await expect(guard(rows).canActivate(contextFor(stored))).resolves.toBe(true);
    await expect(guard(rows).canActivate(contextFor('goodsecret'))).resolves.toBe(true);
  });

  it('uses the same error for a missing token and a wrong secret', async () => {
    const rows = [{ token: stored, tenant_id: 'ten_owner_a' }];
    const missing = await guard(rows).canActivate(contextFor('nosuchtoken')).then(
      () => null,
      (error: unknown) => error,
    );
    const wrong = await guard(rows).canActivate(contextFor('wrongsecret')).then(
      () => null,
      (error: unknown) => error,
    );
    expect(await detail(missing)).toBe('public token does not carry a tenant');
    expect(await detail(wrong)).toBe(await detail(missing));
    expect((missing as UnprocessableEntityException).getStatus()).toBe(
      (wrong as UnprocessableEntityException).getStatus(),
    );
  });

  it('rejects wildcard input and a token stored for more than one tenant', async () => {
    const one = guard([{ token: stored, tenant_id: 'ten_owner_a' }]);
    for (const token of ['%', '_', 'a%']) {
      await expect(one.canActivate(contextFor(token))).rejects.toBeInstanceOf(UnprocessableEntityException);
    }
    const many = guard([
      { token: stored, tenant_id: 'ten_owner_a' },
      { token: mintPublicTenantToken('ten_owner_b', 'goodsecret'), tenant_id: 'ten_owner_b' },
    ]);
    await expect(many.canActivate(contextFor('goodsecret'))).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('rejects a header that names a different tenant', async () => {
    const one = guard([{ token: stored, tenant_id: 'ten_owner_a' }]);
    await expect(one.canActivate(contextFor(stored, 'ten_other'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
