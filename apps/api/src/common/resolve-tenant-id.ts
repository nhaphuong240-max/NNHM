import { ConfigService } from '@nestjs/config';
import { SEED_TENANT_ID } from '../database/database.seed.service';
import type { AuthUser } from '../modules/identity/identity.types';

export function resolveTenantId(
  config: ConfigService,
  user?: AuthUser,
  header?: string,
): string {
  return (
    user?.tenantId ??
    header?.trim() ??
    config.get<string>('DEFAULT_TENANT_ID', SEED_TENANT_ID)
  );
}
