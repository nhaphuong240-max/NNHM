import { Controller, Get, Headers, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Public } from '../identity/decorators/public.decorator';
import type { AuthUser } from '../identity/identity.types';
import { LeadHealthScoreService } from './lead-health-score.service';
import { LeadScoringService } from './lead-scoring.service';

@Controller('ai/scoring')
export class LeadScoringController {
  constructor(
    private readonly scoring: LeadScoringService,
    private readonly health: LeadHealthScoreService,
    private readonly config: ConfigService,
  ) {}

  /** UC-AI-02 worker health — ops / integration */
  @Public()
  @Get('status')
  status(@Headers('x-tenant-id') tenantHeader?: string) {
    return this.scoring.getStatus(resolveTenantId(this.config, undefined, tenantHeader));
  }

  /** P2 FR-LEAD-007b — explainable health score */
  @Get('leads/:leadId/health')
  explainHealth(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('leadId') leadId: string,
  ) {
    return this.health.explainHealth(
      resolveTenantId(this.config, user, tenantHeader),
      leadId,
    );
  }

  /** UC-AI-02 — score explain panel for agent lead detail */
  @Get('leads/:leadId')
  explainLead(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('leadId') leadId: string,
  ) {
    return this.scoring.explainLeadScore(
      resolveTenantId(this.config, user, tenantHeader),
      leadId,
    );
  }
}
