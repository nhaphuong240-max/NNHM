import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { CrmInboxService } from './crm-inbox.service';
import type { InboxChannel } from './crm-inbox.util';

@Controller('crm/inbox')
export class CrmInboxController {
  constructor(
    private readonly inbox: CrmInboxService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.inbox.listThreads(resolveTenantId(this.config, user, tenantHeader));
  }

  @Post(':threadId/reply')
  @HttpCode(200)
  reply(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('threadId') threadId: string,
    @Body() body: { message: string; channel?: InboxChannel },
  ) {
    return this.inbox.reply(
      resolveTenantId(this.config, user, tenantHeader),
      threadId,
      body,
      user?.userId,
    );
  }
}
