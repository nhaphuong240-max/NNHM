import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, NotFoundException, Param, Post } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { oneLookedUpTenant } from '../../common/public-tenant-lookup';
import { assertHeaderMatches } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { canApproveContract, canSendSignLink } from '../identity/role-catalog';
import type { SigningMode } from './esign-multi-party';
import { SignaturePartyService, type PartySignerInput } from './signature-party.service';

@Controller('signature-requests')
export class SignaturePartyController {
  constructor(
    private readonly parties: SignaturePartyService,
    private readonly dataSource: DataSource,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      contractId?: string;
      signingMode?: SigningMode;
      requiresAdminReview?: boolean;
      signers?: PartySignerInput[];
    },
  ) {
    if (!canSendSignLink(user?.role)) {
      throw new ForbiddenException({ detail: 'forbidden' });
    }
    const contractId = body.contractId?.trim() ?? '';
    if (!user?.tenantId?.trim()) {
      throw new NotFoundException({ detail: 'not found' });
    }
    const tenantId = await oneLookedUpTenant(this.dataSource, 'contract', contractId, 'not-found');
    assertHeaderMatches(tenantHeader, tenantId);
    if (user.tenantId !== tenantId) {
      throw new NotFoundException({ detail: 'not found' });
    }
    return this.parties.create({
      tenantId,
      contractId,
      actorId: user?.userId ?? '',
      mode: body.signingMode === 'PARALLEL' ? 'PARALLEL' : 'SEQUENTIAL',
      signers: body.signers ?? [],
      requiresAdminReview: body.requiresAdminReview,
    });
  }

  @Post(':id/send')
  @HttpCode(200)
  async send(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('id') id: string,
  ) {
    if (!canSendSignLink(user?.role)) {
      throw new ForbiddenException({ detail: 'forbidden' });
    }
    if (!user?.tenantId?.trim()) {
      throw new NotFoundException({ detail: 'not found' });
    }
    const tenantId = await oneLookedUpTenant(this.dataSource, 'signature_request', id, 'not-found');
    assertHeaderMatches(tenantHeader, tenantId);
    if (user.tenantId !== tenantId) {
      throw new NotFoundException({ detail: 'not found' });
    }
    return this.parties.sendDue(tenantId, id, user.role);
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('id') id: string,
  ) {
    if (!canSendSignLink(user?.role)) {
      throw new ForbiddenException({ detail: 'forbidden' });
    }
    if (!user?.tenantId?.trim()) {
      throw new NotFoundException({ detail: 'not found' });
    }
    const tenantId = await oneLookedUpTenant(this.dataSource, 'signature_request', id, 'not-found');
    assertHeaderMatches(tenantHeader, tenantId);
    if (user.tenantId !== tenantId) {
      throw new NotFoundException({ detail: 'not found' });
    }
    return this.parties.view(id, tenantId);
  }

  @Post(':id/review')
  @HttpCode(200)
  async review(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('id') id: string,
    @Body() body: { decision?: 'APPROVED' | 'REJECTED'; notes?: string },
  ) {
    if (!canApproveContract(user?.role)) {
      throw new ForbiddenException({ detail: 'forbidden' });
    }
    const tenantId = tenantHeader?.trim() ?? user?.tenantId ?? '';
    if (!tenantId) throw new NotFoundException({ detail: 'not found' });
    if (body.decision !== 'APPROVED' && body.decision !== 'REJECTED') {
      throw new ForbiddenException({ detail: 'forbidden' });
    }
    return this.parties.review(tenantId, id, { userId: user?.userId, role: user?.role }, body.decision, body.notes);
  }
}
