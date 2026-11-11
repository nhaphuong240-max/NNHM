import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PublicResourceTenantGuard } from '../../common/public-resource-tenant.guard';
import { PublicTokenTenantGuard } from '../../common/public-token-tenant.guard';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { OpenDayService } from './open-day.service';

@Controller('open-days')
export class OpenDayController {
  constructor(private readonly openDay: OpenDayService) {}

  @Public()
  @UseGuards(PublicResourceTenantGuard)
  @Get()
  list(
    @Req() request: { tenantId: string },
    @Query('projectId') projectId?: string,
  ) {
    return this.openDay.listEvents(request.tenantId, projectId);
  }

  @Public()
  @UseGuards(PublicResourceTenantGuard)
  @Post(':eventId/rsvp')
  rsvp(
    @Req() request: { tenantId: string },
    @Param('eventId') eventId: string,
    @Body() body: { fullName: string; phone: string; leadId?: string },
  ) {
    return this.openDay.rsvp(request.tenantId, eventId, body);
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
