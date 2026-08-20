import { Body, Controller, Get, Headers, HttpCode, Patch, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import type { TenantConfigDomain } from '../../database/entities/tenant-config-version.entity';
import { RailResolverService } from './rail-resolver.service';
import type { LiveRails } from './live-rails.util';
import { TenantConfigService } from './tenant-config.service';

@Controller('admin/config')
export class TenantConfigController {
  constructor(
    private readonly tenantConfig: TenantConfigService,
    private readonly rails: RailResolverService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status() {
    return { data: this.tenantConfig.status() };
  }

  @Get('history')
  history(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('domain') domain?: TenantConfigDomain,
  ) {
    return this.tenantConfig.getHistory(
      resolveTenantId(this.config, user, tenantHeader),
      domain,
    );
  }

  @Get('rails')
  async railsOverlay(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const overlay = await this.tenantConfig.loadLiveRailsOverlay(tenantId);
    return { data: overlay, meta: { tenantId, uc: ['OPS-S1'] } };
  }

  @Get('rails/resolved')
  async railsResolved(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const resolved = await this.rails.resolve(tenantId);
    const overlay = await this.tenantConfig.loadLiveRailsOverlay(tenantId);
    return {
      data: resolved,
      meta: { tenantId, overlay, source: 'tenant overlay > process env', uc: ['OPS-S1'] },
    };
  }

  @Patch('rails')
  @HttpCode(200)
  async saveRails(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: Partial<LiveRails>,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const resolved = await this.rails.saveOverlay(tenantId, body, user?.userId);
    return { data: resolved, meta: { tenantId, uc: ['OPS-S1'] } };
  }

  @Post('backfill')
  @HttpCode(200)
  backfill(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.tenantConfig.backfillFromAudit(
      resolveTenantId(this.config, user, tenantHeader),
      user?.userId,
    );
  }
}
