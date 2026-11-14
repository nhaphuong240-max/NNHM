import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { oneLookedUpTenant } from '../../common/public-tenant-lookup';
import { assertHeaderMatches, resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { AllowContractSignToken } from './allow-contract-sign-token.decorator';
import { contractSignSecret, readContractSignToken } from './contract-sign-token';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { BookingContractService } from './booking-contract.service';
import type { ContractPreviewInput, ContractSignInput, CreateContractInput } from './booking-contract.types';

@Controller('contracts')
export class BookingContractController {
  constructor(
    private readonly contracts: BookingContractService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  private signSecret(): string {
    const secret = contractSignSecret((key) => this.config.get<string>(key));
    if (!secret) {
      throw new UnprocessableEntityException({ detail: 'contract sign secret is not configured' });
    }
    return secret;
  }

  private async contractTenant(contractId: string | undefined, header: string | undefined) {
    const tenantId = await oneLookedUpTenant(this.dataSource, 'contract', contractId, 'not-found');
    assertHeaderMatches(header, tenantId);
    return tenantId;
  }

  private async signedContractTenant(
    contractId: string,
    header: string | undefined,
    signToken: string | undefined,
  ) {
    const tenantId = await this.contractTenant(contractId, header);
    const claims = readContractSignToken(signToken, this.signSecret());
    if (!claims || claims.contractId !== contractId || claims.tenantId !== tenantId || !claims.buyerId) {
      throw new UnauthorizedException({ detail: 'contract sign token is missing, expired, or for another contract' });
    }
    return tenantId;
  }

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
  async esignWebhook(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('x-esign-signature') signature: string | undefined,
    @Body() body: { contractId?: string; event?: string; signatureRef?: string; envelopeId?: string },
  ) {
    return this.contracts.handleEsignWebhook(
      await this.contractTenant(body.contractId, tenantHeader),
      body,
      JSON.stringify(body),
      signature,
    );
  }

  /** UC-BK-07 — buyer sign session. Requires a short-lived token for this contract. */
  @AllowContractSignToken()
  @Get(':contractId/sign-session')
  async signSession(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('x-contract-sign-token') signToken: string | undefined,
    @Param('contractId') contractId: string,
  ) {
    return this.contracts.getSignSession(
      await this.signedContractTenant(contractId, tenantHeader, signToken),
      contractId,
    );
  }

  /** UC-BK-07 — contract detail for buyer e-sign */
  @AllowContractSignToken()
  @Get(':contractId')
  async detail(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('x-contract-sign-token') signToken: string | undefined,
    @Param('contractId') contractId: string,
  ) {
    return this.contracts.getContract(
      await this.signedContractTenant(contractId, tenantHeader, signToken),
      contractId,
    );
  }

  /** UC-BK-07 — submit e-sign (OTP stub). The token is access control, not a legal signature. */
  @AllowContractSignToken()
  @Post(':contractId/sign')
  @HttpCode(200)
  async sign(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('x-contract-sign-token') signToken: string | undefined,
    @Param('contractId') contractId: string,
    @Body() body: ContractSignInput,
  ) {
    return this.contracts.signContract(
      await this.signedContractTenant(contractId, tenantHeader, signToken),
      contractId,
      body,
    );
  }
}
