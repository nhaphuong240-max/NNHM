import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { oneLookedUpTenant } from '../../common/public-tenant-lookup';
import { requireHostTenant } from '../../common/resolve-tenant-from-host';
import { assertHeaderMatches, resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { CmsHomepageService } from './cms-homepage.service';
import type { HomepageConfigPayload } from './homepage.types';
import { CmsService } from './cms.service';

@Controller('cms')
export class CmsController {
  constructor(
    private readonly cms: CmsService,
    private readonly homepage: CmsHomepageService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  @Public()
  @Get('areas')
  listAreas(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('host') host: string | undefined,
    @Query('city') city?: string,
  ) {
    const tenantId = user?.tenantId?.trim()
      ? resolveTenantId(this.config, user, tenantHeader)
      : requireHostTenant(host);
    assertHeaderMatches(tenantHeader, tenantId);
    return this.cms.listAreas(tenantId, city);
  }

  @Public()
  @Get('areas/:slug')
  async areaLanding(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('slug') slug: string,
  ) {
    const tenantId = user?.tenantId?.trim()
      ? resolveTenantId(this.config, user, tenantHeader)
      : await oneLookedUpTenant(this.dataSource, 'area_slug', slug, 'not-found');
    assertHeaderMatches(tenantHeader, tenantId);
    return this.cms.getAreaLanding(tenantId, slug);
  }

  /** Phase Homepage — public pack (config + live picks/stats/districts) */
  @Public()
  @Get('homepage')
  homepagePack(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('host') host: string | undefined,
  ) {
    const tenantId = user?.tenantId?.trim()
      ? resolveTenantId(this.config, user, tenantHeader)
      : requireHostTenant(host);
    assertHeaderMatches(tenantHeader, tenantId);
    return this.homepage.getHomepagePack(tenantId);
  }

  @Get('homepage/config')
  homepageConfig(@CurrentUser() user: AuthUser) {
    return this.homepage.getConfig(resolveTenantId(this.config, user)).then((data) => ({
      data,
      meta: { tenantId: resolveTenantId(this.config, user) },
    }));
  }

  @Post('homepage/config')
  saveHomepageConfig(
    @CurrentUser() user: AuthUser,
    @Body() body: HomepageConfigPayload,
  ) {
    return this.homepage.updateConfig(resolveTenantId(this.config, user), body, user.userId);
  }

  @Post('pages')
  upsertPage(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      slug: string;
      pageType: 'area' | 'project' | 'faq' | 'landing';
      title: string;
      body: string;
      geoAreaId?: string;
      projectId?: string;
      status?: 'DRAFT' | 'LEGAL_REVIEW' | 'PUBLISHED';
    },
  ) {
    return this.cms.upsertPage(resolveTenantId(this.config, user), body);
  }
}
