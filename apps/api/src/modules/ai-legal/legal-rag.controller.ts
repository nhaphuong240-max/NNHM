import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { LegalRagService } from './legal-rag.service';

@Controller('ai/legal')
export class LegalRagController {
  constructor(
    private readonly legal: LegalRagService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status() {
    return this.legal.status();
  }

  /** UC-AI-03 · SCR-AGENT-001 — indexed legal corpus */
  @Get('corpus')
  listCorpus(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.legal.listCorpus(resolveTenantId(this.config, user, tenantHeader));
  }

  @Post('query')
  @HttpCode(200)
  query(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { query: string; limit?: number },
  ) {
    return this.legal.query(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }
}
