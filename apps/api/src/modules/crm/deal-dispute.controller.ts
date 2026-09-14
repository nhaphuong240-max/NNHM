import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import type { DealDisputeStatus } from '../../database/entities/deal-dispute.entity';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { DealDisputeService } from './deal-dispute.service';

@Controller('disputes')
export class DealDisputeController {
  constructor(
    private readonly disputes: DealDisputeService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.disputes.listDisputes(resolveTenantId(this.config, user));
  }

  @Post()
  open(
    @CurrentUser() user: AuthUser,
    @Body() body: { registrationId: string; summary?: string },
  ) {
    return this.disputes.openDispute(resolveTenantId(this.config, user), body, user.userId);
  }

  @Patch(':id/transition')
  transition(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: DealDisputeStatus; note?: string; attributionKey?: string },
  ) {
    return this.disputes.transition(
      resolveTenantId(this.config, user),
      id,
      body.status,
      user.userId,
      body.note,
      body.attributionKey,
    );
  }
}
