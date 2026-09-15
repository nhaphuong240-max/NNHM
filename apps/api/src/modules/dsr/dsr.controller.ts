import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
  @Get('projects/:projectId/masterplan')
  masterplan(
    @CurrentUser() user: AuthUser | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.dsr.getMasterplan(resolveTenantId(this.config, user), projectId);
  }

  /** Phase B FR-DSR-001 — tower → floor → unit drill-down */
  @Public()
  @Get('projects/:projectId/drill')
  drillDown(
    @CurrentUser() user: AuthUser | undefined,
    @Param('projectId') projectId: string,
    @Query('tower') tower?: string,
    @Query('floor') floor?: string,
  ) {
    return this.dsr.getDrillDown(
      resolveTenantId(this.config, user),
      projectId,
      tower,
      floor,
    );
  }

  @Get('share-links/stats')
  shareStats(
    @CurrentUser() user: AuthUser | undefined,
    @Query('projectId') projectId?: string,
  ) {
    return this.dsr.shareStats(resolveTenantId(this.config, user), projectId);
  }

  @Public()
  @Post('share-links')
  createShare(
    @CurrentUser() user: AuthUser | undefined,
    @Body()
    body: {
      unitId?: string;
      projectId?: string;
      leadId?: string;
      visitorId?: string;
      ttlHours?: number;
    },
  ) {
    return this.dsr.createShareLink(resolveTenantId(this.config, user), body);
  }

  @Public()
  @Get('share/:token')
  openShare(
    @CurrentUser() user: AuthUser | undefined,
    @Param('token') token: string,
  ) {
    return this.dsr.openShareLink(resolveTenantId(this.config, user), token);
  }
}
