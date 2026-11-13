import { Controller, Headers, Query, Sse } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { DataSource } from 'typeorm';
import { oneLookedUpTenant } from '../../common/public-tenant-lookup';
import { assertHeaderMatches, resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { StreamEventsService } from './stream-events.service';

@Controller('stream')
export class StreamController {
  constructor(
    private readonly streamEvents: StreamEventsService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /** API-071 GET /stream/units — UC-GR-07 SSE unit status (public + agent) */
  @Public()
  @Sse('units')
  async units(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Query('unitId') unitId?: string,
    @Query('tenantId') tenantIdQuery?: string,
  ): Promise<Observable<MessageEvent>> {
    const tenantId = user?.tenantId?.trim()
      ? resolveTenantId(this.config, user, tenantHeader)
      : await oneLookedUpTenant(this.dataSource, 'unit', unitId, 'not-found');
    assertHeaderMatches(tenantHeader ?? tenantIdQuery, tenantId);
    return this.streamEvents.subscribeUnits(tenantId, unitId!.trim());
  }
}
