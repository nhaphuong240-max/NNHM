import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, NotFoundException, Param, Post, Query, Req, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { oneLookedUpTenant } from '../../common/public-tenant-lookup';
import { assertHeaderMatches, resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { AllowContractSignToken } from './allow-contract-sign-token.decorator';
import { contractSignSecret, readContractSignToken, type ContractSignClaims } from './contract-sign-token';
import { SignatureTicketService } from './signature-ticket.service';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { canSendSignLink } from '../identity/role-catalog';
import { BookingContractService } from './booking-contract.service';
import type { ContractPreviewInput, ContractSignInput, CreateContractInput } from './booking-contract.types';
import { EsignLinkService } from './esign-link.service';

@Controller('contracts')
export class BookingContractController {
  constructor(
    private readonly contracts: BookingContractService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly tickets?: SignatureTicketService,
    private readonly links?: EsignLinkService,
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

  private async readSignedClaims(
    contractId: string,
    header: string | undefined,
    signToken: string | undefined,
  ): Promise<{ tenantId: string; claims: ContractSignClaims }> {
    const tenantId = await this.contractTenant(contractId, header);
    const claims = readContractSignToken(signToken, this.signSecret());
    if (!claims || claims.contractId !== contractId || claims.tenantId !== tenantId || !claims.buyerId) {
      throw new UnauthorizedException({ detail: 'contract sign token is missing, expired, or for another contract' });
    }
    if (!this.tickets) {
      throw new UnauthorizedException({ detail: 'contract sign token is missing, expired, or for another contract' });
    }
    return { tenantId, claims };
  }

  private async signedContractTenant(
    contractId: string,
    header: string | undefined,
    signToken: string | undefined,
  ): Promise<{ tenantId: string; claims: ContractSignClaims }> {
    const access = await this.readSignedClaims(contractId, header, signToken);
    await this.tickets?.assertUsable(access.claims);
    return access;
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

  /**
   * Staff send-on-behalf. `contracts.send_sign_link` only (PROCEDURE_STAFF, ADMIN).
   * Missing permission is 403 with no lookup. buyerId is resolved from the booking/lead.
   */
  @Post(':contractId/sign-link')
  @HttpCode(200)
  async sendSignLink(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('contractId') contractId: string,
    @Body() body: { resend?: boolean },
  ) {
    if (!canSendSignLink(user?.role) || !this.links) {
      throw new ForbiddenException({ detail: 'forbidden' });
    }
    if (!user?.tenantId?.trim()) {
      throw new NotFoundException({ detail: 'not found' });
    }
    const tenantId = await this.contractTenant(contractId, tenantHeader);
    if (user.tenantId !== tenantId) {
      throw new NotFoundException({ detail: 'not found' });
    }
    const loaded = await this.contracts.getContract(tenantId, contractId);
    const bookingId = loaded.data.attributes.bookingId?.trim() ?? '';
    if (!bookingId) {
      throw new NotFoundException({ detail: 'not found' });
    }
    const sent = await this.links.send({
      tenantId,
      contractId: loaded.data.id,
      bookingId,
      buyerName: loaded.data.attributes.mergeContext.buyerName,
      documentText: loaded.data.attributes.mergedText,
      resend: body.resend === true,
      actor: { userId: user.userId, role: user.role },
    });
    const actuallySent = sent.sent && !sent.idempotentReplay && !sent.sending;
    await this.dataSource.getRepository(AuditEventEntity).save({
      tenantId,
      entityType: 'contract',
      entityId: loaded.data.id,
      action: actuallySent ? 'SIGN_LINK_SENT' : 'SIGN_LINK_PENDING',
      payload: { role: user?.role, channel: sent.channel, destMasked: sent.destMasked },
      actorId: user?.userId ?? null,
    });
    return { data: sent, meta: { uc: ['UC-BK-07'] } };
  }

  /** UC-BK-07 — buyer sign session. Requires a short-lived token for this contract. */
  @AllowContractSignToken()
  @Get(':contractId/sign-session')
  async signSession(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('x-contract-sign-token') signToken: string | undefined,
    @Param('contractId') contractId: string,
    @Req() req?: Request,
  ) {
    const access = await this.signedContractTenant(contractId, tenantHeader, signToken);
    return this.contracts.getSignSession(access.tenantId, contractId, access.claims, {
      ip: req?.ip ?? null,
      userAgent: typeof req?.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
    });
  }

  /** UC-BK-07 — contract detail for buyer e-sign */
  @AllowContractSignToken()
  @Get(':contractId')
  async detail(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('x-contract-sign-token') signToken: string | undefined,
    @Param('contractId') contractId: string,
  ) {
    const access = await this.signedContractTenant(contractId, tenantHeader, signToken);
    return this.contracts.getContract(access.tenantId, contractId);
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
    @Req() req?: Request,
  ) {
    const access = await this.readSignedClaims(contractId, tenantHeader, signToken);
    const ctx = {
      ip: req?.ip ?? null,
      userAgent: typeof req?.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
    };
    if (!this.tickets) {
      throw new UnauthorizedException({ detail: 'sign access ticket is required' });
    }
    const vault = await this.tickets.pendingVault(access.claims);
    if (vault === 'used') {
      throw new UnauthorizedException({ detail: 'contract sign token was already used' });
    }
    if (vault === 'pending') {
      return this.contracts.finishSignedVault(await this.contracts.rebuildPendingSignature(access.claims));
    }
    await this.tickets.assertUsable(access.claims);
    const providerName = await this.contracts.signingProviderName(access.tenantId);
    return this.tickets.completeSign(
      access.claims,
      body.otp,
      (manager) => this.contracts.signContract(access.tenantId, contractId, body, access.claims, true, manager, providerName, ctx),
      (prepared) => this.contracts.finishSignedVault(prepared),
    );
  }
}
