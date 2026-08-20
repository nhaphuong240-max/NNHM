import { Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { ErpInvoicingService } from './erp-invoicing.service';

@Controller('integrations/erp')
export class ErpInvoicingController {
  constructor(
    private readonly erp: ErpInvoicingService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status() {
    return this.erp.status();
  }

  /** T7-S8 — push data product billing to external ERP */
  @Post('invoices/sync')
  @HttpCode(200)
  syncInvoice(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.erp.syncInvoice(resolveTenantId(this.config, user, tenantHeader)).then((data) => ({
      data,
      meta: { uc: ['T7-S8', 'T6-S2'], connector: 'ERP', provider: 'MISA' },
    }));
  }
}
