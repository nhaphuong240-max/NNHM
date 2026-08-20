import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import type { BookingEntity } from '../../database/entities/booking.entity';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { BookingService } from './booking.service';
import type { BookingTimelineFilter, CancelBookingInput, CreateBookingInput } from './booking.types';

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly booking: BookingService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  async status(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const lockMetrics = await this.booking.getLockMetrics(tenantId);
    return { ...this.booking.status(), lockMetrics };
  }

  /** API-054 POST /bookings — UC-BK-01 S3-01 Redis lock */
  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: CreateBookingInput,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.booking.create(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      idempotencyKey,
    );
  }

  /** API-053 GET /bookings — list for agent/buyer deal tracker */
  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('leadId') leadId?: string,
    @Query('status') status?: BookingEntity['status'],
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    return this.booking.listBookings(resolveTenantId(this.config, user, tenantHeader), {
      leadId: leadId?.trim() || undefined,
      status,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  }

  /** API-055 GET /bookings/{bookingId} — UC-BK-02 read */
  @Get(':bookingId')
  getOne(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
  ) {
    return this.booking.getById(
      resolveTenantId(this.config, user, tenantHeader),
      bookingId,
    );
  }

  /** UC-BK-04 · SCR-ADMIN-006 — replay evidence pack */
  @Get(':bookingId/replay')
  replay(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
  ) {
    return this.booking.getReplay(
      resolveTenantId(this.config, user, tenantHeader),
      bookingId,
    );
  }

  /** OP-WIN-03 · UC-TR-01 — domain events CSV export */
  @Get(':bookingId/replay/export.csv')
  async exportReplayCsv(
    @Res() res: Response,
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const csv = await this.booking.exportReplayCsv(tenantId, bookingId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="booking-${bookingId}-replay.csv"`,
    );
    res.send(csv);
  }

  /** API-059 GET /bookings/{bookingId}/timeline — UC-BK-03 S3-03 */
  @Get(':bookingId/timeline')
  timeline(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
    @Query('filter') filterRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const filter = parseTimelineFilter(filterRaw);
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    return this.booking.getTimeline(
      resolveTenantId(this.config, user, tenantHeader),
      bookingId,
      filter,
      limit,
    );
  }

  /** API-060 GET /bookings/{bookingId}/events — UC-BK-03 / OP-WIN-03 */
  @Get(':bookingId/events')
  events(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
    @Query('filter') filterRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const filter = parseTimelineFilter(filterRaw);
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    return this.booking.getDomainEvents(
      resolveTenantId(this.config, user, tenantHeader),
      bookingId,
      filter,
      limit,
    );
  }

  /** API-057 DELETE /bookings/{bookingId} — UC-BK-05 cancel + refund path */
  @Delete(':bookingId')
  cancel(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
    @Body() body: CancelBookingInput,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    void idempotencyKey;
    return this.booking.cancelBooking(
      resolveTenantId(this.config, user, tenantHeader),
      bookingId,
      body,
      user?.userId,
    );
  }
}

function parseTimelineFilter(raw?: string): BookingTimelineFilter {
  if (raw === 'state' || raw === 'payment' || raw === 'system') return raw;
  return 'all';
}
