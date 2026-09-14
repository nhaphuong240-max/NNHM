import { Controller, Get, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { AttributionGraphService } from './attribution-graph.service';

@Controller('attribution')
export class AttributionController {
  constructor(
    private readonly graph: AttributionGraphService,
    private readonly config: ConfigService,
  ) {}

  @Get('graph')
  getGraph(
    @CurrentUser() user: AuthUser,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.graph.getGraph(resolveTenantId(this.config, user), { campaignId });
  }
}
