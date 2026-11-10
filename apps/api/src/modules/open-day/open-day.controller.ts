import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PublicTokenTenantGuard } from '../../common/public-token-tenant.guard';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { OpenDayService } from './open-day.service';

@Controller('open-days')
export class OpenDayController {
  constructor(
    private readonly openDay: OpenDayService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Query('projectId') projectId?: string,
  ) {
    return this.openDay.listEvents(resolveTenantId(this.config, user), projectId);
  }

  @Public()
  @Post(':eventId/rsvp')
  rsvp(
    @CurrentUser() user: AuthUser | undefined,
    @Param('eventId') eventId: string,
    @Body() body: { fullName: string; phone: string; leadId?: string },
  ) {
    return this.openDay.rsvp(resolveTenantId(this.config, user), eventId, body);
  }

  @UseGuards(PublicTokenTenantGuard)
  @Post('check-in')
  checkIn(
    @CurrentUser() user: AuthUser,
    @Req() request: { tenantId: string },
    @Body() body: { qrToken: string },
  ) {
    if (user.tenantId !== request.tenantId) {
      throw new ForbiddenException({ detail: 'token tenant does not match the signed-in tenant' });
    }
    return this.openDay.checkIn(request.tenantId, body.qrToken, user.userId);
  }
}
