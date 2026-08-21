import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import type { AuthUser } from '../identity/identity.types';
import { RailResolverService } from './rail-resolver.service';

/** Blocks POST /simulate* when tenant LIVE_RAILS.simulateEndpoints=false. */
@Injectable()
export class SimulateRailGuard implements CanActivate {
  constructor(
    private readonly rails: RailResolverService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      headers: Record<string, string | undefined>;
    }>();
    const tenantId = resolveTenantId(
      this.config,
      request.user,
      request.headers['x-tenant-id'],
    );
    await this.rails.assertSimulateAllowed(tenantId);
    return true;
  }
}
