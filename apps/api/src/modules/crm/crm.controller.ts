import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { CrmService } from './crm.service';
import type { CreateLeadInput, LeadImportCommitInput, LeadImportPreviewInput, PatchLeadInput } from './crm.types';

@Controller('leads')
export class CrmController {
  constructor(
    private readonly crm: CrmService,
    private readonly config: ConfigService,
  ) {}

  /** API-041 GET /leads — UC-CRM-03 pipeline source */
  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.crm.listLeads(resolveTenantId(this.config, user, tenantHeader));
  }

  /** API-042 POST /leads — UC-CRM-01 lead capture (public form or agent) */
  @Public()
  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: CreateLeadInput,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.crm.createLead(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      idempotencyKey,
      user?.userId,
    );
  }

  /** UC-CRM-04 — CSV import preview */
  @Post('import/preview')
  @HttpCode(200)
  previewImport(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: LeadImportPreviewInput,
  ) {
    return this.crm.previewLeadImport(resolveTenantId(this.config, user, tenantHeader), body);
  }

  /** UC-CRM-04 — CSV import commit */
  @Post('import/commit')
  @HttpCode(201)
  commitImport(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: LeadImportCommitInput,
  ) {
    return this.crm.commitLeadImport(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  /** API-043 GET /leads/{leadId} — UC-CRM-02 lead detail */
  @Get(':leadId')
  getOne(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('leadId') leadId: string,
  ) {
    return this.crm.getLead(resolveTenantId(this.config, user, tenantHeader), leadId);
  }

  /** API-044 PATCH /leads/{leadId} — UC-CRM-03 stage update */
  @Patch(':leadId')
  patch(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('leadId') leadId: string,
    @Body() body: PatchLeadInput,
  ) {
    return this.crm.patchLead(
      resolveTenantId(this.config, user, tenantHeader),
      leadId,
      body,
      user?.userId,
    );
  }
}
