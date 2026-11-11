import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { lookupTenants, recordUnscopedAudit } from '../../common/public-tenant-lookup';
import { assertHeaderMatches, resolveTenantId } from '../../common/resolve-tenant-id';
import { verifyWebhookSignature } from '../payment/webhook/webhook-signature.util';
import type { KycSubjectType } from '../../database/entities/kyc-profile.entity';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { EkycService } from './ekyc.service';
import { SimulateRailGuard } from '../tenant-config/simulate-rail.guard';

@Controller('kyc/ekyc')
export class EkycController {
  constructor(
    private readonly ekyc: EkycService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  @Public()
  @Get('status')
  status() {
    return { data: this.ekyc.status() };
  }

  @Post(':subjectType/:subjectId/start')
  @HttpCode(200)
  start(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('subjectType') subjectType: KycSubjectType,
    @Param('subjectId') subjectId: string,
    @Body() body: { documentType?: string },
  ) {
    return this.ekyc.startVerification(
      resolveTenantId(this.config, user, tenantHeader),
      subjectType,
      subjectId,
      user?.userId,
      body.documentType,
    );
  }

  @Public()
  @Post('webhooks/vnpt')
  @HttpCode(200)
  async webhook(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('x-webhook-signature') signature: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const secret = this.config.get<string>('EKYC_WEBHOOK_SECRET', '');
    const signed =
      Boolean(secret) &&
      verifyWebhookSignature(body, signature ?? (typeof body.signature === 'string' ? body.signature : undefined), secret);
    const externalRef = typeof body.externalRef === 'string' ? body.externalRef : '';
    const rows = externalRef ? await lookupTenants(this.dataSource, 'ekyc_external', externalRef) : [];
    const matched = rows.length === 1 ? rows[0]! : null;
    if (!signed) {
      await recordUnscopedAudit(this.dataSource, {
        tenantId: matched,
        entityType: 'kyc_profile',
        entityId: externalRef || 'missing',
        action: 'WEBHOOK_REJECTED',
        payload: { reason: 'bad-signature' },
      });
      throw new UnauthorizedException({ detail: 'Invalid eKYC webhook signature' });
    }
    if (rows.length !== 1) {
      await recordUnscopedAudit(this.dataSource, {
        tenantId: null,
        entityType: 'kyc_profile',
        entityId: externalRef || 'missing',
        action: 'WEBHOOK_REJECTED',
        payload: { reason: rows.length > 1 ? 'ambiguous-record' : 'no-matching-record' },
      });
      if (rows.length > 1) {
        throw new UnprocessableEntityException({ detail: 'eKYC webhook matches more than one tenant' });
      }
      throw new NotFoundException({ detail: 'eKYC webhook does not match a stored session' });
    }
    assertHeaderMatches(tenantHeader, matched!);
    return this.ekyc.handleWebhook(matched!, body);
  }

  @Post('simulate/approve')
  @HttpCode(200)
  @UseGuards(SimulateRailGuard)
  async simulateApprove(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { externalRef: string },
  ) {
    const tenantId = user?.tenantId?.trim()
      ? resolveTenantId(this.config, user, tenantHeader)
      : await lookupTenants(this.dataSource, 'ekyc_external', body.externalRef).then((rows) => {
          if (rows.length !== 1) {
            throw new UnprocessableEntityException({ detail: 'tenant is required' });
          }
          return rows[0]!;
        });
    assertHeaderMatches(tenantHeader, tenantId);
    return this.ekyc.simulateApprove(tenantId, body.externalRef.trim(), user?.userId);
  }
}
