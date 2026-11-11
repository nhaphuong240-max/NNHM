import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PublicResourceTenantGuard } from '../../common/public-resource-tenant.guard';
import { PublicTokenTenantGuard } from '../../common/public-token-tenant.guard';
import { ShareLinkTenantGuard } from '../../common/share-link-tenant.guard';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { DsrService } from './dsr.service';

@Controller('dsr')
export class DsrController {
  constructor(
    private readonly dsr: DsrService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @UseGuards(PublicResourceTenantGuard)
  @Get('projects/:projectId/masterplan')
  masterplan(
    @Req() request: { tenantId: string },
    @Param('projectId') projectId: string,
  ) {
    return this.dsr.getMasterplan(request.tenantId, projectId);
  }

  /** Phase B FR-DSR-001 — tower → floor → unit drill-down */
  @Public()
  @UseGuards(PublicResourceTenantGuard)
  @Get('projects/:projectId/drill')
  drillDown(
    @Req() request: { tenantId: string },
    @Param('projectId') projectId: string,
    @Query('tower') tower?: string,
    @Query('floor') floor?: string,
  ) {
    return this.dsr.getDrillDown(request.tenantId, projectId, tower, floor);
  }

  @Get('share-links/stats')
  shareStats(
    @CurrentUser() user: AuthUser | undefined,
    @Query('projectId') projectId?: string,
  ) {
    return this.dsr.shareStats(resolveTenantId(this.config, user), projectId);
  }

  @Public()
  @UseGuards(ShareLinkTenantGuard)
  @Post('share-links')
  createShare(
    @Req() request: { tenantId: string },
    @Body()
    body: {
      unitId?: string;
      projectId?: string;
      leadId?: string;
      visitorId?: string;
      ttlHours?: number;
      entryToken?: string;
    },
  ) {
    return this.dsr.createShareLink(request.tenantId, body);
  }

  @Public()
  @UseGuards(PublicTokenTenantGuard)
  @Get('share/:token')
  openShare(
    @Req() request: { tenantId: string },
    @Param('token') token: string,
  ) {
    return this.dsr.openShareLink(request.tenantId, token);
  }
}
