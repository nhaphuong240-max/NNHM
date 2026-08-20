import { Controller, Get, Headers, Query, Sse } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { StreamEventsService } from './stream-events.service';

@Controller('stream')
export class StreamController {
  constructor(
    private readonly streamEvents: StreamEventsService,
    private readonly config: ConfigService,
  ) {}

  /** API-071 GET /stream/units — UC-GR-07 SSE unit status (public + agent) */
  @Public()
  @Sse('units')
  units(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Query('tenantId') tenantIdQuery?: string,
  ): Observable<MessageEvent> {
    const tenantId = resolveTenantId(this.config, user, tenantHeader ?? tenantIdQuery);
    return this.streamEvents.subscribeUnits(tenantId);
  }
}
