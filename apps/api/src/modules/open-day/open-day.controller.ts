import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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

  @Post('check-in')
  checkIn(@CurrentUser() user: AuthUser, @Body() body: { qrToken: string }) {
    return this.openDay.checkIn(resolveTenantId(this.config, user), body.qrToken, user.userId);
  }
}
