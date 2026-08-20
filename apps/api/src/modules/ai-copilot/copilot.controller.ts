import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { CopilotService } from './copilot.service';
import type { CopilotGenerateInput } from './copilot.types';

@Controller('ai/copilot')
export class CopilotController {
  constructor(
    private readonly copilot: CopilotService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status() {
    return this.copilot.status();
  }

  /** API-067 · UC-AI-01 · FR-AI-01,03,04 */
  @Post('generate')
  @HttpCode(200)
  generate(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: CopilotGenerateInput,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.copilot.generate(tenantId, body, user?.userId);
  }
}
