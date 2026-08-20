import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import type { RegulatoryExportScope } from './regulatory-export.util';
import { RegulatoryExportService } from './regulatory-export.service';

@Controller('regulatory-export')
export class RegulatoryExportController {
  constructor(
    private readonly exports: RegulatoryExportService,
    private readonly config: ConfigService,
  ) {}

  /** UC-TR-04 · SCR-ADMIN-018 */
  @Get('jobs')
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.exports.listJobs(resolveTenantId(this.config, user, tenantHeader));
  }

  @Post('jobs')
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      scope: RegulatoryExportScope;
      dateFrom: string;
      dateTo: string;
      legalTicketId?: string;
    },
  ) {
    return this.exports.createJob(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Get('jobs/:jobId')
  getOne(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('jobId') jobId: string,
  ) {
    return this.exports.getJob(resolveTenantId(this.config, user, tenantHeader), jobId);
  }

  @Get('jobs/:jobId/download')
  download(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('jobId') jobId: string,
  ) {
    return this.exports.downloadPack(resolveTenantId(this.config, user, tenantHeader), jobId);
  }
}
