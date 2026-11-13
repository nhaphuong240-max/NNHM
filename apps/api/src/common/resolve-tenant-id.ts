import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SEED_TENANT_ID } from '../database/database.seed.service';
import { allowDefaultTenant } from './default-tenant-flag';
import type { AuthUser } from '../modules/identity/identity.types';

/**
 * Tenant comes from the signed-in user. The header is only a match check.
 * A seed tenant is returned only when ALLOW_DEFAULT_TENANT=true and NODE_ENV is development or test.
 */
export function resolveTenantId(
  config: ConfigService,
  user?: AuthUser,
  header?: string,
): string {
  const userTenant = user?.tenantId?.trim() || '';
  const headerTenant = header?.trim() || '';
  if (userTenant) {
    if (headerTenant && headerTenant !== userTenant) {
      throw new ForbiddenException({
        detail: 'X-Tenant-Id does not match authenticated tenant',
      });
    }
    return userTenant;
  }
  if (allowDefaultTenant()) {
    return config.get<string>('DEFAULT_TENANT_ID', SEED_TENANT_ID);
  }
  throw new UnprocessableEntityException({ detail: 'tenant is required' });
}

export function assertHeaderMatches(header: string | undefined, tenantId: string): void {
  const headerTenant = header?.trim();
  if (headerTenant && headerTenant !== tenantId) {
    throw new ForbiddenException({
      detail: 'X-Tenant-Id does not match the tenant already bound to this request',
    });
  }
}
