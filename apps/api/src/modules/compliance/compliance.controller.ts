import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import type { ConsentSubjectType } from '../../database/entities/consent-ledger-entry.entity';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { ConsentLedgerService } from './consent-ledger.service';

@Controller('compliance')
export class ComplianceController {
  constructor(
    private readonly consent: ConsentLedgerService,
    private readonly config: ConfigService,
  ) {}

  @Get('consent/status')
  status() {
    return { data: this.consent.status() };
  }

  @Get('consent/:subjectType/:subjectId')
  listForSubject(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('subjectType') subjectType: ConsentSubjectType,
    @Param('subjectId') subjectId: string,
  ) {
    return this.consent.listForSubject(
      resolveTenantId(this.config, user, tenantHeader),
      subjectType,
      subjectId,
    );
  }

  @Get('consent/export')
  exportCsv(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('limit') limit?: string,
  ) {
    return this.consent.exportCsv(
      resolveTenantId(this.config, user, tenantHeader),
      limit ? Number(limit) : 500,
    );
  }
}
