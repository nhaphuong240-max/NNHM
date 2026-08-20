import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { AiReplyService } from './ai-reply.service';
import type { AiReplyTone } from './ai-reply.util';

@Controller('ai/reply')
export class AiReplyController {
  constructor(
    private readonly reply: AiReplyService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status() {
    return this.reply.status();
  }

  @Post('draft')
  @HttpCode(200)
  draft(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { leadId?: string; inboundMessage: string; tone?: AiReplyTone },
  ) {
    return this.reply.draft(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Post('send')
  @HttpCode(200)
  send(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { draftId: string; replyText: string; channel?: string; leadId?: string },
  ) {
    return this.reply.send(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }
}
