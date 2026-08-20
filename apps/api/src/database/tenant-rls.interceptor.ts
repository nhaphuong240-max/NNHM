import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, switchMap, tap } from 'rxjs';
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
    const headerTenant = request.headers['x-tenant-id']?.trim();
    const tenantId = request.tenantId ?? headerTenant ?? null;
    const isPlatformAdmin = user?.role === 'PLATFORM_ADMIN';

    if (!tenantId && !isPlatformAdmin) {
      return next.handle();
    }

    return from(this.tenantRls.bindRequestContext(tenantId, isPlatformAdmin)).pipe(
      switchMap(() => next.handle()),
      tap({
        finalize: () => {
          void this.tenantRls.clearRequestContext();
        },
      }),
    );
  }
}
