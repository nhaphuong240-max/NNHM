import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import type { CopilotGenerateInput } from '../ai-copilot/copilot.types';
import { AiGatewayService } from './ai-gateway.service';

@Controller('ai/gateway')
export class AiGatewayController {
  constructor(
    private readonly gateway: AiGatewayService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status() {
    return this.gateway.status();
  }

  /** ADR-005 · API-067 — listing copilot via gateway */
  @Post('copilot/generate')
  @HttpCode(200)
  generateCopilot(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: CopilotGenerateInput,
  ) {
    return this.gateway.generateCopilot(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  /** ADR-005 · UC-AI-03 — legal RAG with citation guardrail */
  @Post('legal/query')
  @HttpCode(200)
  queryLegal(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { query?: string; limit?: number },
  ) {
    return this.gateway.queryLegal(
      resolveTenantId(this.config, user, tenantHeader),
      { query: body.query ?? '', limit: body.limit },
      user?.userId,
    );
  }
}
