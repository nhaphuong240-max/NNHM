import { CanActivate, ExecutionContext, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { lookupTenants } from '../../common/public-tenant-lookup';
import { assertHeaderMatches, resolveTenantId } from '../../common/resolve-tenant-id';
import type { AuthUser } from '../identity/identity.types';
import { RailResolverService } from './rail-resolver.service';

/** Blocks POST /simulate* when tenant LIVE_RAILS.simulateEndpoints=false. */
@Injectable()
export class SimulateRailGuard implements CanActivate {
  constructor(
    private readonly rails: RailResolverService,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      headers: Record<string, string | undefined>;
      body?: { externalRef?: string };
    }>();
    const header = request.headers['x-tenant-id'];
    let tenantId = request.user?.tenantId?.trim() || '';
    if (tenantId) {
      tenantId = resolveTenantId({ get: () => undefined } as never, request.user, header);
    } else if (request.body?.externalRef?.trim()) {
      const rows = await lookupTenants(this.dataSource, 'ekyc_external', request.body.externalRef);
      if (rows.length !== 1) {
        throw new UnprocessableEntityException({ detail: 'tenant is required' });
      }
      tenantId = rows[0]!;
      assertHeaderMatches(header, tenantId);
    } else {
      throw new UnprocessableEntityException({ detail: 'tenant is required' });
    }
    await this.rails.assertSimulateAllowed(tenantId);
    return true;
  }
}
