import { Controller, Get, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { NotifyService } from './notify.service';

@Controller('crm/notifications')
export class NotifyController {
  constructor(
    private readonly notify: NotifyService,
    private readonly config: ConfigService,
  ) {}

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.notify.deliveryStats(resolveTenantId(this.config, user));
  }

  @Get('leads/:leadId')
  forLead(@CurrentUser() user: AuthUser, @Param('leadId') leadId: string) {
    return this.notify.listForLead(resolveTenantId(this.config, user), leadId);
  }
}
