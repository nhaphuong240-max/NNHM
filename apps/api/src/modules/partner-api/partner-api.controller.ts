import { Body, Controller, Get, Headers, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Public } from '../identity/decorators/public.decorator';
import { BookingService } from '../booking/booking.service';
import { CrmService } from '../crm/crm.service';
import { GoldenRecordService } from '../golden-record/golden-record.service';
import { PartnerApiKeyGuard } from './partner-api-key.guard';

/** T3-S4 + T5-S4 — partner-facing API (SDK v2) */
@Public()
@Controller('partner/v1')
@UseGuards(PartnerApiKeyGuard)
export class PartnerApiController {
  constructor(
    private readonly crm: CrmService,
    private readonly booking: BookingService,
    private readonly goldenRecord: GoldenRecordService,
  ) {}

  @Post('leads')
  @HttpCode(201)
  createLead(
    @Headers('x-tenant-id') tenantId: string,
    @Body()
    body: {
      fullName: string;
      phone: string;
      source?: string;
      consent?: { privacyAccepted: boolean; privacyPolicyVersion?: string; marketing?: boolean };
    },
  ) {
    return this.crm.createLead(tenantId.trim(), {
      fullName: body.fullName,
      phone: body.phone,
      source: body.source ?? 'PARTNER_SDK',
      consent: body.consent ?? { privacyAccepted: true, privacyPolicyVersion: '2026-07-01' },
    });
  }

  @Get('bookings/:bookingId/status')
  getBookingStatus(
    @Headers('x-tenant-id') tenantId: string,
    @Param('bookingId') bookingId: string,
  ) {
    return this.booking.getById(tenantId.trim(), bookingId.trim());
  }

  @Post('units/sync')
  @HttpCode(200)
  async syncUnits(
    @Headers('x-tenant-id') tenantId: string,
    @Body()
    body: {
      idempotencyKey: string;
      units: Array<{ unitId: string; status?: string; basePrice?: number }>;
    },
  ) {
    const updated = [];
    for (const unit of body.units ?? []) {
      const current = await this.goldenRecord.getUnit(tenantId.trim(), unit.unitId);
      const patch = {
        ...(unit.status ? { status: unit.status as never } : {}),
        ...(unit.basePrice != null ? { basePrice: unit.basePrice } : {}),
        expectedVersion: current.data.attributes.version,
      };
      if (Object.keys(patch).length <= 1) continue;
      const result = await this.goldenRecord.patchUnit(tenantId.trim(), unit.unitId, patch);
      updated.push(result.data);
    }
    return {
      data: { updated, idempotencyKey: body.idempotencyKey },
      meta: { uc: ['T5-S4'], connector: 'ERP', mode: 'sandbox' },
    };
  }

  @Post('webhooks/verify')
  @HttpCode(200)
  verifyWebhook(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-partner-signature') signature: string,
    @Body() body: Record<string, unknown>,
  ) {
    const secret = process.env.PARTNER_WEBHOOK_SECRET ?? 'wereal_partner_stub_secret';
    const payload = JSON.stringify(body);
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    const valid = signature?.trim() === expected || signature?.trim() === `sha256=${expected}`;
    return {
      data: { valid, tenantId: tenantId.trim() },
      meta: { uc: ['T5-S3'], sdk: 'v2' },
    };
  }
}
