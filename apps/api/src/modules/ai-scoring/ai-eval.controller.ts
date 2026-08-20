import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { AiEvalService } from './ai-eval.service';
import { LeadConversionService } from './lead-conversion.service';

@Controller('ai')
export class AiEvalController {
  constructor(
    private readonly evalService: AiEvalService,
    private readonly conversion: LeadConversionService,
    private readonly config: ConfigService,
  ) {}

  @Get('eval/status')
  evalStatus() {
    return this.evalService.status();
  }

  /** T4-S6 — CSV import stub: leadId,manualTier */
  @Post('eval/import')
  @HttpCode(200)
  importEval(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { csv?: string },
  ) {
    return this.evalService.evaluateFromCsv(
      resolveTenantId(this.config, user, tenantHeader),
      body.csv ?? '',
    );
  }

  /** TC-12 — HOT conversion funnel metrics */
  @Get('scoring/hot-conversion')
  hotConversion(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.conversion.getHotConversionMetrics(tenantId).then((data) => ({
      data,
      meta: { tenantId, uc: ['TC-12', 'UC-AI-02'], screen: 'SCR-AGENT-001' },
    }));
  }

  /** TC-12 — legal RAG hallucination rate (citation coverage) */
  @Get('eval/legal-hallucination')
  legalHallucination() {
    const data = this.evalService.legalHallucinationEval();
    return {
      data,
      meta: { uc: ['TC-12', 'UC-AI-03'], screen: 'SCR-AGENT-001' },
    };
  }
}
