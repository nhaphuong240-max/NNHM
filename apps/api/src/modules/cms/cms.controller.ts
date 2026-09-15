import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
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
  ) {}

  @Public()
  @Get('areas')
  listAreas(
    @CurrentUser() user: AuthUser | undefined,
    @Query('city') city?: string,
  ) {
    return this.cms.listAreas(resolveTenantId(this.config, user), city);
  }

  @Public()
  @Get('areas/:slug')
  areaLanding(
    @CurrentUser() user: AuthUser | undefined,
    @Param('slug') slug: string,
  ) {
    return this.cms.getAreaLanding(resolveTenantId(this.config, user), slug);
  }

  /** Phase Homepage — public pack (config + live picks/stats/districts) */
  @Public()
  @Get('homepage')
  homepagePack(@CurrentUser() user: AuthUser | undefined) {
    return this.homepage.getHomepagePack(resolveTenantId(this.config, user));
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
