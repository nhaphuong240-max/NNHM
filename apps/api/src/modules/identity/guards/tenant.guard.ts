import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '../identity.types';
import { IS_PUBLIC_KEY } from '../identity.types';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      headers: Record<string, string | undefined>;
      tenantId?: string;
    }>();

    const user = request.user;
    const headerTenant = request.headers['x-tenant-id']?.trim();

    if (!user?.tenantId) {
      if (headerTenant) request.tenantId = headerTenant;
      return true;
    }

    if (headerTenant && headerTenant !== user.tenantId) {
      throw new ForbiddenException({
        type: 'https://wereal.dev/problems/cross-tenant',
        title: 'Cross-tenant access denied',
        detail: 'X-Tenant-Id does not match authenticated tenant',
      });
    }

    request.tenantId = user.tenantId;
    return true;
  }
}
