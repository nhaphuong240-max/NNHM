import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEventEntity } from '../../database/entities/analytics-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { DealDisputeEntity } from '../../database/entities/deal-dispute.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { LeadRegistrationEntity } from '../../database/entities/lead-registration.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';
import { SlaBreachLogEntity } from '../../database/entities/sla-breach-log.entity';
import { ViewingEntity } from '../../database/entities/viewing.entity';

/** P0 §0.2(10) — KPI pack mục 16 SRS from real DB (no mock). */
@Injectable()
export class CrmKpiService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(ViewingEntity)
    private readonly viewings: Repository<ViewingEntity>,
    @InjectRepository(LeadRegistrationEntity)
    private readonly registrations: Repository<LeadRegistrationEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(AnalyticsEventEntity)
    private readonly events: Repository<AnalyticsEventEntity>,
    @InjectRepository(SearchIndexDocEntity)
    private readonly indexDocs: Repository<SearchIndexDocEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(DealDisputeEntity)
    private readonly disputes: Repository<DealDisputeEntity>,
    @InjectRepository(SlaBreachLogEntity)
    private readonly slaBreaches: Repository<SlaBreachLogEntity>,
  ) {}

  async getKpiPack(tenantId: string, projectId?: string) {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      searchEvents,
      zeroSearchEvents,
      hotLeads,
      hotTouched,
      viewingsConfirmed,
      viewingsCompleted,
      bookingsWithLead,
      allBookings,
      activeRegs,
      indexCount,
      freshListings,
      openDisputes,
      closedDisputes,
      qualifiedViewingsWeek,
    ] = await Promise.all([
      this.events.count({ where: { tenantId, name: 'search_submitted' } }),
      this.events
        .createQueryBuilder('e')
        .where('e.tenant_id = :tenantId', { tenantId })
        .andWhere('e.name = :name', { name: 'search_submitted' })
        .andWhere("e.payload->>'zeroResult' = 'true'")
        .getCount(),
      this.leads.count({ where: { tenantId, tier: 'HOT' } }),
      this.leads
        .createQueryBuilder('l')
        .where('l.tenant_id = :tenantId', { tenantId })
        .andWhere('l.tier = :tier', { tier: 'HOT' })
        .andWhere('l.first_touch_at IS NOT NULL')
        .getCount(),
      this.viewings.count({ where: { tenantId, status: 'CONFIRMED' } }),
      this.viewings.count({ where: { tenantId, status: 'COMPLETED' } }),
      this.bookings
        .createQueryBuilder('b')
        .where('b.tenant_id = :tenantId', { tenantId })
        .andWhere('b.lead_id IS NOT NULL')
        .getCount(),
      this.bookings.count({ where: { tenantId } }),
      this.registrations.count({ where: { tenantId, status: 'ACCEPTED' } }),
      this.indexDocs.count({ where: { tenantId } }),
      this.listings
        .createQueryBuilder('l')
        .where('l.tenant_id = :tenantId', { tenantId })
        .andWhere('l.status = :status', { status: 'PUBLISHED' })
        .andWhere('l.freshness_paused_at IS NULL')
        .andWhere('l.updated_at >= :since30d', { since30d })
        .getCount(),
      this.disputes.count({ where: { tenantId, status: 'OPEN' } }),
      this.disputes
        .createQueryBuilder('d')
        .where('d.tenant_id = :tenantId', { tenantId })
        .andWhere('d.status = :status', { status: 'CLOSED' })
        .andWhere('d.closed_at >= :since7d', { since7d })
        .getCount(),
      this.viewings
        .createQueryBuilder('v')
        .where('v.tenant_id = :tenantId', { tenantId })
        .andWhere('v.status = :status', { status: 'COMPLETED' })
        .andWhere('v.outcome LIKE :prefix', { prefix: 'COMPLETED_%' })
        .andWhere('v.updated_at >= :since7d', { since7d })
        .getCount(),
    ]);

    const zeroResultRate = searchEvents ? zeroSearchEvents / searchEvents : null;
    const hotFirstTouchRate = hotLeads ? hotTouched / hotLeads : null;
    const viewingShowUp =
      viewingsConfirmed + viewingsCompleted > 0
        ? viewingsCompleted / (viewingsConfirmed + viewingsCompleted)
        : null;
    const bookingLeadLinkRate = allBookings ? bookingsWithLead / allBookings : null;
    const listingFreshnessRate = indexCount ? freshListings / indexCount : null;

    return {
      data: {
        attributes: {
          northStarQualifiedViewingsPerWeek: qualifiedViewingsWeek,
          zeroResultRate,
          hotFirstTouchRate,
          viewingShowUpRate: viewingShowUp,
          bookingLeadLinkRate,
          listingFreshnessRate,
          activeRegistrations: activeRegs,
          openDisputes,
          closedDisputes7d: closedDisputes,
          searchSubmittedTotal: searchEvents,
          projectId: projectId ?? null,
          targets: {
            zeroResultRateMax: 0.15,
            hotFirstTouchP95Minutes: 5,
            viewingShowUpMin: 0.6,
            bookingLeadLinkMin: 1,
            listingFreshnessMin: 0.95,
          },
          notes: {
            searchP95: 'n/a — cần APM trace',
            detailToContact: 'n/a — đo baseline P1',
          },
        },
      },
      meta: { tenantId, source: 'real-db', screen: 'SCR-AGENT-KPI', uc: 'SRS-§16' },
    };
  }
}
