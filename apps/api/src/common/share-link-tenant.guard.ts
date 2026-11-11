import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isObservable, lastValueFrom } from 'rxjs';
import { DataSource } from 'typeorm';
import type { AuthUser } from '../modules/identity/identity.types';
import { lookupTenantByPublicToken } from './public-tenant-lookup';
import { configuredCatalogToken, tenantIdFromPublicToken } from './public-tenant-token';

type ShareRequest = {
  headers: Record<string, string | string[] | undefined>;
  body?: { entryToken?: string };
  user?: AuthUser;
  tenantId?: string;
};

/**
 * Share creation is not an anonymous write. A bearer token is verified when
 * present. The tenant comes from that user, or from a public token that
 * already names a tenant. The header is never the source.
 */
@Injectable()
export class ShareLinkTenantGuard extends AuthGuard('jwt') {
  constructor(private readonly dataSource: DataSource) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ShareRequest>();
    const authorization = headerValue(request.headers.authorization);
    if (authorization) {
      const result = super.canActivate(context);
      const allowed = isObservable(result) ? await lastValueFrom(result) : await result;
      if (!allowed) {
        throw new UnauthorizedException({ detail: 'Missing or invalid access token' });
      }
    }

    let tenantId = request.user?.tenantId?.trim() || null;
    const presented = request.body?.entryToken?.trim() ?? '';
    if (presented) {
      const found = await lookupTenantByPublicToken(this.dataSource, presented);
      const catalog = configuredCatalogToken();
      const embedded = tenantIdFromPublicToken(presented);
      const fromToken =
        found.length === 1
          ? found[0]
          : catalog && presented === catalog && embedded
            ? embedded
            : null;
      if (!fromToken || found.length > 1) {
        throw new UnprocessableEntityException({ detail: 'public token does not carry a tenant' });
      }
      if (embedded && embedded !== fromToken) {
        throw new UnprocessableEntityException({
          detail: 'public token tenant does not match the stored row',
        });
      }
      if (tenantId && tenantId !== fromToken) {
        throw new ForbiddenException({ detail: 'token tenant does not match the signed-in tenant' });
      }
      tenantId = fromToken;
    }
    if (!tenantId) {
      throw new UnauthorizedException({
        detail: 'creating a share link requires a signed-in user or a public token',
      });
    }

    const header = headerValue(request.headers['x-tenant-id']);
    if (header && header !== tenantId) {
      throw new ForbiddenException({ detail: 'X-Tenant-Id does not match the share tenant' });
    }
    request.tenantId = tenantId;
    return true;
  }

  handleRequest<TUser>(err: Error | null, user: TUser | false): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException({ detail: 'Missing or invalid access token' });
    }
    return user;
  }
}

function headerValue(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? '';
}
