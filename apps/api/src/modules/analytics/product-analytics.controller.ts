import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import type { AnalyticsEventName } from '../../database/entities/analytics-event.entity';
import { ProductAnalyticsService } from './product-analytics.service';

@Controller('analytics')
export class ProductAnalyticsController {
  constructor(
    private readonly analytics: ProductAnalyticsService,
    private readonly config: ConfigService,
  ) {}

  /** P0 FR-EVT-001 — public product analytics beacon */
  @Public()
  @Post('events')
  trackEvents(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      events?: {
        name: AnalyticsEventName;
        source?: string;
        consentBasis?: string;
        sessionId?: string;
        visitorId?: string;
        entityType?: string;
        entityId?: string;
        payload?: Record<string, unknown>;
      }[];
      name?: AnalyticsEventName;
      source?: string;
      consentBasis?: string;
      sessionId?: string;
      visitorId?: string;
      entityType?: string;
      entityId?: string;
      payload?: Record<string, unknown>;
    },
  ) {
    const tenantId = resolveTenantId(this.config, undefined, tenantHeader);
    if (body.events?.length) {
      return this.analytics.trackBatch(
        tenantId,
        body.events.map((e) => ({
          name: e.name,
          source: e.source ?? 'web',
          consentBasis: e.consentBasis,
          sessionId: e.sessionId,
          visitorId: e.visitorId,
          entityType: e.entityType,
          entityId: e.entityId,
          payload: e.payload,
        })),
      );
    }
    if (!body.name) {
      return { data: [], meta: { count: 0, skipped: true } };
    }
    return this.analytics.track({
      tenantId,
      name: body.name,
      source: body.source ?? 'web',
      consentBasis: body.consentBasis,
      sessionId: body.sessionId,
      visitorId: body.visitorId,
      entityType: body.entityType,
      entityId: body.entityId,
      payload: body.payload,
    });
  }
}
