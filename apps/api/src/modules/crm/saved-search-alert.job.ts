import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessErrorCode } from '../../common/business-error';
import { ListingEntity } from '../../database/entities/listing.entity';
import { SavedSearchEntity } from '../../database/entities/saved-search.entity';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { DemandPolicyService } from './demand-policy.service';
import { isBusinessTime } from './sla-calendar.util';

/** P0 FR-SRCH-003b — match new listings to saved searches (sandbox log). */
@Injectable()
export class SavedSearchAlertJob {
  private readonly logger = new Logger(SavedSearchAlertJob.name);

  constructor(
    @InjectRepository(SavedSearchEntity)
    private readonly saved: Repository<SavedSearchEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    private readonly policy: DemandPolicyService,
  ) {}

  @Cron('*/60 * * * * *')
  async processAlerts() {
    const tenants = await this.tenants.find({ where: { isActive: true }, take: 20 });
    for (const t of tenants) {
      await this.processTenant(t.id);
    }
  }

  async processTenant(tenantId: string) {
    const payload = await this.policy.resolvePayload(tenantId);
    const now = new Date();
    const inQuietHours = !isBusinessTime(now, {
      ...payload.sla,
      businessDays: [1, 2, 3, 4, 5, 6, 7],
      businessHours: payload.alerts.quietHours,
    });

    const rows = await this.saved.find({
      where: { tenantId },
      take: 200,
    });

    const recentListings = await this.listings.find({
      where: { tenantId, status: 'PUBLISHED' },
      order: { updatedAt: 'DESC' },
      take: 20,
    });

    for (const search of rows) {
      if (search.alertFrequency === 'none' || search.alertOptOut) continue;
      if (inQuietHours) continue;
      if (search.alertsSentToday >= payload.alerts.maxPerDay) continue;

      const matches = recentListings.filter((l) => this.matchesSearch(search, l));
      if (!matches.length) continue;

      search.lastAlertAt = now;
      search.alertsSentToday += 1;
      await this.saved.save(search);

      this.logger.log(
        `Alert sandbox ${search.id} → ${matches.length} matches (code=${BusinessErrorCode.ALERT_OPTED_OUT} if opted out)`,
      );
    }
  }

  private matchesSearch(search: SavedSearchEntity, listing: ListingEntity): boolean {
    if (listing.freshnessPausedAt) return false;
    const intent = search.intent === 'rent' ? 'rent' : 'sale';
    if (listing.transactionType !== intent && search.intent !== 'project') return false;
    const q = search.q?.trim().toLowerCase();
    if (q && !listing.title.toLowerCase().includes(q)) return false;
    const minPrice = search.filters.minPrice as number | undefined;
    const maxPrice = search.filters.maxPrice as number | undefined;
    const price = Number(listing.priceDisplay ?? 0);
    if (minPrice !== undefined && price < minPrice) return false;
    if (maxPrice !== undefined && price > maxPrice) return false;
    return true;
  }
}
