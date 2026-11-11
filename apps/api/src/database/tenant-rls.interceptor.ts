import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuthUser } from '../modules/identity/identity.types';
import { TenantRlsService } from './tenant-rls.service';

@Injectable()
export class TenantRlsInterceptor implements NestInterceptor {
  constructor(private readonly tenantRls: TenantRlsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      headers: Record<string, string | undefined>;
      tenantId?: string;
    }>();

    const user = request.user;
    const headerTenant = request.headers['x-tenant-id']?.trim() || null;
    const boundTenant = request.tenantId?.trim() || null;
    const userTenant = user?.tenantId?.trim() || null;

    let tenantId: string | null = null;
    if (user) {
      tenantId = userTenant;
      if (boundTenant && userTenant && boundTenant !== userTenant) {
        throw new ForbiddenException({
          detail: 'token tenant does not match the signed-in tenant',
        });
      }
    } else if (boundTenant) {
      tenantId = boundTenant;
    }

    if (headerTenant && tenantId && headerTenant !== tenantId) {
      throw new ForbiddenException({
        detail: 'X-Tenant-Id does not match the tenant already bound to this request',
      });
    }

    const isPlatformAdmin = user?.role === 'PLATFORM_ADMIN';
    return new Observable((subscriber) => {
      let inner: { unsubscribe: () => void } | undefined;
      this.tenantRls.runWithContext(
        { tenantId: tenantId ?? '', isPlatformAdmin },
        () => {
          inner = next.handle().subscribe(subscriber);
        },
      );
      return () => inner?.unsubscribe();
    });
  }
}
