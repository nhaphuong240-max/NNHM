import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Public } from '../identity/decorators/public.decorator';
import type { AuthUser } from '../identity/identity.types';
import { CrmDemandService } from './crm-demand.service';
import type { ViewingOutcome, ViewingStatus } from '../../database/entities/viewing.entity';

@Controller()
export class CrmDemandController {
  constructor(
    private readonly demand: CrmDemandService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('viewings')
  @HttpCode(201)
  requestViewing(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      fullName: string;
      phone: string;
      email?: string;
      unitId?: string;
      projectId?: string;
      listingId?: string;
      requestedSlot?: string;
      note?: string;
      inquiryType?: string;
      consent?: { privacyAccepted?: boolean; privacyPolicyVersion?: string; marketing?: boolean };
    },
  ) {
    return this.demand.requestViewing(resolveTenantId(this.config, user, tenantHeader), body);
  }

  @Get('viewings')
  listViewings(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.demand.listViewings(resolveTenantId(this.config, user, tenantHeader));
  }

  @Get('viewings/availability')
  viewingAvailability(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('agentId') agentId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.demand.viewingAvailability(
      resolveTenantId(this.config, user, tenantHeader),
      agentId,
      from,
      to,
    );
  }

  @Patch('viewings/:viewingId')
  patchViewing(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('viewingId') viewingId: string,
    @Body() body: { status?: ViewingStatus; outcome?: ViewingOutcome; note?: string },
  ) {
    return this.demand.patchViewing(
      resolveTenantId(this.config, user, tenantHeader),
      viewingId,
      body,
      user?.userId,
    );
  }

  @Post('lead-registrations')
  @HttpCode(201)
  register(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      fullName: string;
      phone: string;
      projectId: string;
      unitId?: string;
      intent?: string;
      note?: string;
      consent?: { privacyAccepted?: boolean; privacyPolicyVersion?: string };
    },
  ) {
    return this.demand.registerCustomer(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId ?? 'usr_agent_01',
    );
  }

  @Get('lead-registrations')
  listRegistrations(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.demand.listRegistrations(resolveTenantId(this.config, user, tenantHeader), user?.userId);
  }

  @Public()
  @Post('saved-searches')
  @HttpCode(201)
  saveSearch(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      visitorId: string;
      intent?: string;
      q?: string;
      filters?: Record<string, unknown>;
      alertFrequency?: 'none' | 'daily' | 'instant';
      marketingConsent?: boolean;
    },
  ) {
    return this.demand.saveSearch(resolveTenantId(this.config, user, tenantHeader), body);
  }

  @Public()
  @Get('saved-searches')
  listSaved(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('visitorId') visitorId: string,
  ) {
    return this.demand.listSavedSearches(resolveTenantId(this.config, user, tenantHeader), visitorId);
  }

  @Public()
  @Delete('saved-searches/:id')
  removeSaved(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('id') id: string,
    @Query('visitorId') visitorId: string,
  ) {
    return this.demand.deleteSavedSearch(resolveTenantId(this.config, user, tenantHeader), id, visitorId);
  }
}
