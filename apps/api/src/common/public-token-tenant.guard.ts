import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { lookupTenantByPublicToken } from './public-tenant-lookup';
import { configuredCatalogToken, tenantIdFromPublicToken } from './public-tenant-token';

type PublicRequest = {
  params?: Record<string, string | undefined>;
  body?: { entryToken?: string; qrToken?: string; challengeId?: string };
  headers: Record<string, string | undefined>;
  tenantId?: string;
};

@Injectable()
export class PublicTokenTenantGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PublicRequest>();
    const token =
      request.params?.token ??
      request.body?.entryToken ??
      request.body?.qrToken ??
      request.body?.challengeId;
    const presented = token?.trim() ?? '';
    if (!presented) {
      throw new UnprocessableEntityException({ detail: 'public token does not carry a tenant' });
    }

    const fromRows = await lookupTenantByPublicToken(this.dataSource, presented);
    if (fromRows.length > 1) {
      throw new UnprocessableEntityException({ detail: 'public token matches more than one tenant' });
    }

    const embedded = tenantIdFromPublicToken(presented);
    let tenantId: string | null = null;
    if (fromRows.length === 1) {
      if (embedded && embedded !== fromRows[0]) {
        throw new UnprocessableEntityException({
          detail: 'public token tenant does not match the stored row',
        });
      }
      tenantId = fromRows[0];
    } else {
      const catalog = configuredCatalogToken();
      if (catalog && presented === catalog && embedded) tenantId = embedded;
    }
    if (!tenantId) {
      throw new UnprocessableEntityException({ detail: 'public token does not carry a tenant' });
    }

    const header = request.headers['x-tenant-id']?.trim();
    if (header && header !== tenantId) {
      throw new ForbiddenException({ detail: 'X-Tenant-Id does not match the token tenant' });
    }
    request.tenantId = tenantId;
    return true;
  }
}
