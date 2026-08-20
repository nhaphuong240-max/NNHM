import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { BookingContractService } from './booking-contract.service';
import type { ContractPreviewInput, ContractSignInput, CreateContractInput } from './booking-contract.types';

@Controller('contracts')
export class BookingContractController {
  constructor(
    private readonly contracts: BookingContractService,
    private readonly config: ConfigService,
  ) {}

  /** UC-BK-06 — template catalog */
  @Get('templates')
  templates() {
    return this.contracts.listTemplates();
  }

  /** UC-BK-06 — list drafted contracts */
  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('bookingId') bookingId?: string,
  ) {
    return this.contracts.listDrafts(resolveTenantId(this.config, user, tenantHeader), bookingId);
  }

  /** UC-BK-06 — merge preview without persisting */
  @Post('preview')
  @HttpCode(200)
  preview(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: ContractPreviewInput,
  ) {
    return this.contracts.preview(resolveTenantId(this.config, user, tenantHeader), body);
  }

  /** UC-BK-06 — persist contract draft (audit-backed) */
  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: CreateContractInput,
  ) {
    return this.contracts.createDraft(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  /** UC-BK-07 — provider callback (VNPT SmartCA / legal adapter) */
  @Public()
  @Post('webhooks/esign')
  @HttpCode(200)
  esignWebhook(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('x-esign-signature') signature: string | undefined,
    @Body() body: { contractId?: string; event?: string; signatureRef?: string; envelopeId?: string },
  ) {
    return this.contracts.handleEsignWebhook(
      resolveTenantId(this.config, undefined, tenantHeader),
      body,
      JSON.stringify(body),
      signature,
    );
  }

  /** UC-BK-07 — buyer sign session (public + tenant header) */
  @Public()
  @Get(':contractId/sign-session')
  signSession(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('contractId') contractId: string,
  ) {
    return this.contracts.getSignSession(
      resolveTenantId(this.config, undefined, tenantHeader),
      contractId,
    );
  }

  /** UC-BK-07 — contract detail for buyer e-sign */
  @Public()
  @Get(':contractId')
  detail(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('contractId') contractId: string,
  ) {
    return this.contracts.getContract(
      resolveTenantId(this.config, undefined, tenantHeader),
      contractId,
    );
  }

  /** UC-BK-07 — submit e-sign (OTP stub) */
  @Public()
  @Post(':contractId/sign')
  @HttpCode(200)
  sign(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('contractId') contractId: string,
    @Body() body: ContractSignInput,
  ) {
    return this.contracts.signContract(
      resolveTenantId(this.config, undefined, tenantHeader),
      contractId,
      body,
    );
  }
}
