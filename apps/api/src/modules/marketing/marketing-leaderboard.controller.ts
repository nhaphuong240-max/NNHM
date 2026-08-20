import { Body, Controller, Get, Headers } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { MarketingLeaderboardService } from './marketing-leaderboard.service';

@Controller('marketing/leaderboard')
export class MarketingLeaderboardController {
  constructor(
    private readonly leaderboard: MarketingLeaderboardService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.leaderboard.getLeaderboard(resolveTenantId(this.config, user, tenantHeader));
  }
}
