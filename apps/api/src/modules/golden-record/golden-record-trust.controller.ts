import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { DeveloperTrustScoreService } from './developer-trust-score.service';

@Controller('golden-record/trust-score')
export class GoldenRecordTrustController {
  constructor(
    private readonly trust: DeveloperTrustScoreService,
    private readonly config: ConfigService,
  ) {}

  /** T4-S2 — developer trust score for project */
  @Get(':projectId')
  async getTrustScore(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const data = await this.trust.getTrustScore(tenantId, projectId.trim());
    return {
      data,
      meta: { tenantId, uc: ['UC-GR-03', 'OP-WIN-04'], screen: 'SCR-DEV-001' },
    };
  }

  /** Dev portal leaderboard */
  @Get()
  async leaderboard(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('limit') limitRaw?: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 10;
    const data = await this.trust.getLeaderboard(
      tenantId,
      Number.isFinite(limit) ? limit : 10,
    );
    return {
      data,
      meta: { tenantId, count: data.length, uc: ['UC-GR-03'] },
    };
  }
}
