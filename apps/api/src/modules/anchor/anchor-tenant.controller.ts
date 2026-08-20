import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import type { AnchorPilotClass } from '../../database/entities/anchor-tenant-profile.entity';
import { AnchorTenantService, OnboardLivePilotInput } from './anchor-tenant.service';

@Controller('anchor')
export class AnchorTenantController {
  constructor(
    private readonly anchor: AnchorTenantService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('profiles')
  listProfiles(@Query('pilotClass') pilotClass?: AnchorPilotClass) {
    return this.anchor.listAnchors(pilotClass).then((data) => ({
      data,
      meta: {
        count: data.length,
        pilotClass: pilotClass ?? 'ALL',
        liveCount: data.filter((r) => r.pilotClass === 'LIVE').length,
        syntheticCount: data.filter((r) => r.pilotClass === 'SYNTHETIC').length,
        uc: ['T5-S1', 'T5-S7'],
        screen: 'SCR-DEV-001',
      },
    }));
  }

  @Get('dashboard')
  dashboard(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.anchor.getAnchorDashboard(tenantId).then((data) => ({
      data,
      meta: { tenantId, uc: ['T5-S1'], screen: 'SCR-DEV-001' },
    }));
  }

  @Public()
  @Get('leaderboard')
  leaderboard() {
    return this.anchor.getLeaderboard().then((data) => ({
      data,
      meta: {
        count: data.length,
        liveAnchors: data.filter((r) => r.profile.pilotClass === 'LIVE').length,
        syntheticAnchors: data.filter((r) => r.profile.pilotClass === 'SYNTHETIC').length,
        uc: ['T5-S1'],
      },
    }));
  }

  @Public()
  @Get('onboard/checklist/:tenantId')
  onboardingChecklist(@Param('tenantId') tenantId: string) {
    return this.anchor.getOnboardingChecklist(tenantId).then((data) => ({
      data,
      meta: { tenantId, uc: ['T5-S1', 'T5-S7'], screen: 'SCR-DEV-001' },
    }));
  }

  @Public()
  @Get('network/scale')
  networkScale() {
    return this.anchor.getNetworkScaleStatus().then((scale) => ({
      data: scale,
      meta: { tier: 'T7-S6', gate: 'T7-G6', uc: ['T5-S7'] },
    }));
  }

  @Post('onboard/pilot')
  onboardPilot(@Body() body: OnboardLivePilotInput = {}) {
    return this.anchor.onboardLivePilot(body).then((data) => ({
      data,
      meta: { uc: ['T5-S1', 'T5-S7'], screen: 'SCR-DEV-001' },
    }));
  }
}
