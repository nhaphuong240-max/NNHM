import { Controller, Get, Headers, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { AuditService } from './audit.service';

@Controller('audit/events')
export class AuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('bookingId') bookingId?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

    return this.audit.list({
      tenantId: resolveTenantId(this.config, user, tenantHeader),
      entityType: entityType?.trim() || undefined,
      entityId: entityId?.trim() || undefined,
      bookingId: bookingId?.trim() || undefined,
      action: action?.trim() || undefined,
      actorId: actorId?.trim() || undefined,
      dateFrom: dateFrom?.trim() || undefined,
      dateTo: dateTo?.trim() || undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  }

  /** S5-05 GET /audit/events/export.csv — BR-24 retention export */
  @Get('export.csv')
  async exportCsv(
    @Res() res: Response,
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('bookingId') bookingId?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const csv = await this.audit.exportCsv({
      tenantId,
      entityType: entityType?.trim() || undefined,
      entityId: entityId?.trim() || undefined,
      bookingId: bookingId?.trim() || undefined,
      action: action?.trim() || undefined,
      actorId: actorId?.trim() || undefined,
      dateFrom: dateFrom?.trim() || undefined,
      dateTo: dateTo?.trim() || undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-export.csv"');
    res.send(csv);
  }
}
