import { Controller, Get, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Public } from '../identity/decorators/public.decorator';
import type { AuthUser } from '../identity/identity.types';
import { NotifyRailsService } from './notify-rails.service';
import { NotifyService } from './notify.service';

@Controller('crm/notifications')
export class NotifyController {
  constructor(
    private readonly notify: NotifyService,
    private readonly rails: NotifyRailsService,
    private readonly config: ConfigService,
  ) {}

  /** Phase A — SMS/ZNS prod readiness (ops) */
  @Public()
  @Get('rails/status')
  railsStatus(@CurrentUser() user: AuthUser | undefined) {
    return this.rails.status(resolveTenantId(this.config, user));
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.notify.deliveryStats(resolveTenantId(this.config, user));
  }

  @Get('leads/:leadId')
  forLead(@CurrentUser() user: AuthUser, @Param('leadId') leadId: string) {
    return this.notify.listForLead(resolveTenantId(this.config, user), leadId);
  }
}
