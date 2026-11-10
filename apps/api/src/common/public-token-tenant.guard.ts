import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { tenantIdFromPublicToken } from './public-tenant-token';

type PublicRequest = {
  params?: Record<string, string | undefined>;
  body?: { entryToken?: string; qrToken?: string; challengeId?: string };
  headers: Record<string, string | undefined>;
  tenantId?: string;
};

@Injectable()
export class PublicTokenTenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<PublicRequest>();
    const token =
      request.params?.token ??
      request.body?.entryToken ??
      request.body?.qrToken ??
      request.body?.challengeId;
    const tenantId = tenantIdFromPublicToken(token);
    if (!tenantId) {
      throw new UnprocessableEntityException({
        detail: 'public token does not carry a tenant',
      });
    }
    const header = request.headers['x-tenant-id']?.trim();
    if (header && header !== tenantId) {
      throw new ForbiddenException({
        detail: 'X-Tenant-Id does not match the token tenant',
      });
    }
    request.tenantId = tenantId;
    return true;
  }
}
