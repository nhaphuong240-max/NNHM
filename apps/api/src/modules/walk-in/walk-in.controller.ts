import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PublicTokenTenantGuard } from '../../common/public-token-tenant.guard';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { WalkInService } from './walk-in.service';

@Controller('walk-in')
export class WalkInController {
  constructor(
    private readonly walkIn: WalkInService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status() {
    return this.walkIn.status();
  }

  @Get('galleries')
  listGalleries(@CurrentUser() user: AuthUser) {
    return this.walkIn.listGalleries(resolveTenantId(this.config, user));
  }

  @Get('galleries/:galleryId/check-ins')
  checkIns(@CurrentUser() user: AuthUser, @Param('galleryId') galleryId: string) {
    return this.walkIn.listCheckIns(resolveTenantId(this.config, user), galleryId);
  }

  @Public()
  @UseGuards(PublicTokenTenantGuard)
  @Get('galleries/:token')
  gallery(
    @Req() request: { tenantId: string },
    @Param('token') token: string,
  ) {
    return this.walkIn.getGalleryByToken(request.tenantId, token);
  }

  @Public()
  @UseGuards(PublicTokenTenantGuard)
  @Post('galleries/:token/check-in')
  checkIn(
    @Req() request: { tenantId: string },
    @Param('token') token: string,
    @Body()
    body: {
      fullName: string;
      phone: string;
      consent?: { privacyAccepted?: boolean; privacyPolicyVersion?: string };
    },
  ) {
    return this.walkIn.checkIn(request.tenantId, token, body);
  }

  @UseGuards(PublicTokenTenantGuard)
  @Post('galleries/:token/agent-check-in')
  agentCheckIn(
    @CurrentUser() user: AuthUser,
    @Req() request: { tenantId: string },
    @Param('token') token: string,
    @Body()
    body: {
      fullName: string;
      phone: string;
      consent?: { privacyAccepted?: boolean; privacyPolicyVersion?: string };
    },
  ) {
    if (user.tenantId !== request.tenantId) {
      throw new ForbiddenException({ detail: 'token tenant does not match the signed-in tenant' });
    }
    return this.walkIn.checkIn(request.tenantId, token, body, user.userId);
  }

}
