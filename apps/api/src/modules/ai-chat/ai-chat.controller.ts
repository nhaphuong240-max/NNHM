import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { tenantFromTokenOrProject } from '../../common/public-tenant-lookup';
import { assertHeaderMatches } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { AiChatService } from './ai-chat.service';

@Controller('ai/chat')
export class AiChatController {
  constructor(
    private readonly chat: AiChatService,
    private readonly dataSource: DataSource,
  ) {}

  @Public()
  @Get('status')
  status() {
    return this.chat.status();
  }

  @Public()
  @Post('sessions')
  @HttpCode(201)
  async start(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { entryToken?: string; projectId?: string },
  ) {
    const tenantId = await tenantFromTokenOrProject(
      this.dataSource,
      body.entryToken,
      body.projectId,
    );
    assertHeaderMatches(tenantHeader, tenantId);
    return this.chat.startSession(tenantId);
  }

  @Public()
  @Post('messages')
  @HttpCode(200)
  async message(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      sessionId: string;
      text: string;
      entryToken?: string;
      projectId?: string;
      captureLead?: { fullName?: string; phone?: string };
    },
  ) {
    const tenantId = await tenantFromTokenOrProject(
      this.dataSource,
      body.entryToken,
      body.projectId,
    );
    assertHeaderMatches(tenantHeader, tenantId);
    return this.chat.message(tenantId, body);
  }
}
