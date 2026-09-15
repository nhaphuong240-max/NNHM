import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
  @Get('galleries/:token')
  gallery(
    @CurrentUser() user: AuthUser | undefined,
    @Param('token') token: string,
  ) {
    return this.walkIn.getGalleryByToken(resolveTenantId(this.config, user), token);
  }

  @Public()
  @Post('galleries/:token/check-in')
  checkIn(
    @CurrentUser() user: AuthUser | undefined,
    @Param('token') token: string,
    @Body()
    body: {
      fullName: string;
      phone: string;
      consent?: { privacyAccepted?: boolean; privacyPolicyVersion?: string };
    },
  ) {
    return this.walkIn.checkIn(resolveTenantId(this.config, user), token, body);
  }

  @Post('galleries/:token/agent-check-in')
  agentCheckIn(
    @CurrentUser() user: AuthUser,
    @Param('token') token: string,
    @Body()
    body: {
      fullName: string;
      phone: string;
      consent?: { privacyAccepted?: boolean; privacyPolicyVersion?: string };
    },
  ) {
    return this.walkIn.checkIn(resolveTenantId(this.config, user), token, body, user.userId);
  }

}
