import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { computeSlaBucket } from '../crm/crm-sla.util';
import { LeadEntity } from '../../database/entities/lead.entity';
import { computeDeveloperLeaderboard } from './marketing-leaderboard.util';

@Injectable()
export class MarketingLeaderboardService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
  ) {}

  /** UC-MKT-03 · SCR-DEV-009 */
  async getLeaderboard(tenantId: string) {
    const agencies = await this.tenants.find({ where: { type: 'AGENCY' }, take: 20 });
    const penalties = await this.loadPenalties(tenantId);

    const rows = await Promise.all(
      agencies.map(async (agency) => {
        const agencyBookings = await this.bookings.find({
          where: { tenantId },
          take: 100,
        });
        const deposited = agencyBookings.filter((b) =>
          ['DEPOSITED', 'CONTRACTED', 'CLOSED'].includes(b.status),
        );
        const closed = agencyBookings.filter((b) => (b.status as string) === 'CLOSED');
        const gmvVnd = deposited.reduce((sum, b) => sum + Number(b.depositAmount ?? 0), 0);

        const agencyLeads = await this.leads.find({ where: { tenantId }, take: 50 });
        const tracked = agencyLeads.filter((l) => computeSlaBucket(l) !== null);
        const overdue = tracked.filter((l) => computeSlaBucket(l) === 'overdue').length;
        const slaScore = tracked.length
          ? Math.round(((tracked.length - overdue) / tracked.length) * 100)
          : 80;

        return {
          tenantId: agency.id,
          name: agency.name,
          depositedCount: deposited.length,
          dealsClosed: closed.length,
          gmvVnd,
          penaltyPoints: penalties.get(agency.id) ?? 0,
          slaScore,
        };
      }),
    );

    const data = computeDeveloperLeaderboard(rows);

    return {
      data,
      meta: {
        tenantId,
        count: data.length,
        uc: ['UC-MKT-03'],
        screen: 'SCR-DEV-009',
        period: 'rolling-90d-pilot',
      },
    };
  }

  private async loadPenalties(tenantId: string): Promise<Map<string, number>> {
    const rows = await this.auditEvents.find({
      where: { tenantId, entityType: 'marketplace_penalty', action: 'APPLY' },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      const payload = (row.payload ?? {}) as { total?: number };
      if (typeof payload.total === 'number') {
        map.set(row.entityId, payload.total);
      }
    }
    return map;
  }
}
