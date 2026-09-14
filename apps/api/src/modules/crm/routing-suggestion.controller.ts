import { Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { RoutingSuggestionService } from './routing-suggestion.service';

@Controller('crm/routing/suggestions')
export class RoutingSuggestionController {
  constructor(
    private readonly suggestions: RoutingSuggestionService,
    private readonly config: ConfigService,
  ) {}

  /** P2 FR-REV-002 — pending suggestions for human review */
  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.suggestions.listPending(
      resolveTenantId(this.config, user, tenantHeader),
    );
  }

  @Post(':id/approve')
  approve(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('id') id: string,
  ) {
    return this.suggestions.approve(
      resolveTenantId(this.config, user, tenantHeader),
      id,
      user?.userId ?? 'system',
    );
  }

  @Post(':id/reject')
  reject(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('id') id: string,
  ) {
    return this.suggestions.reject(
      resolveTenantId(this.config, user, tenantHeader),
      id,
      user?.userId ?? 'system',
    );
  }
}
