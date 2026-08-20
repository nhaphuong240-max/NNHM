import { Body, Controller, Get, Headers, HttpCode, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { CrmService } from './crm.service';
import type { CreateActivityInput } from './crm.types';

@Controller('activities')
export class ActivitiesController {
  constructor(
    private readonly crm: CrmService,
    private readonly config: ConfigService,
  ) {}

  /** API-047 GET /activities — UC-CRM-04 timeline */
  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Query('leadId') leadId?: string,
    @Query('type') type?: string,
  ) {
    return this.crm.listActivities(
      resolveTenantId(this.config, user, tenantHeader),
      leadId,
      type,
    );
  }

  /** API-048 POST /activities — quick activity log */
  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: CreateActivityInput,
  ) {
    return this.crm.createActivity(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }
}
