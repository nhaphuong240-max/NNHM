import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { AiChatService } from './ai-chat.service';

@Controller('ai/chat')
export class AiChatController {
  constructor(
    private readonly chat: AiChatService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('status')
  status() {
    return this.chat.status();
  }

  @Public()
  @Post('sessions')
  @HttpCode(201)
  start(@Headers('x-tenant-id') tenantHeader: string | undefined) {
    return this.chat.startSession(resolveTenantId(this.config, undefined, tenantHeader));
  }

  @Public()
  @Post('messages')
  @HttpCode(200)
  message(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      sessionId: string;
      text: string;
      captureLead?: { fullName?: string; phone?: string };
    },
  ) {
    return this.chat.message(resolveTenantId(this.config, undefined, tenantHeader), body);
  }
}
