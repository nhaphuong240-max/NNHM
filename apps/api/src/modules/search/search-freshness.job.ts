import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingEntity } from '../../database/entities/listing.entity';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { TenantDemandPolicyEntity } from '../../database/entities/tenant-demand-policy.entity';
import { DEFAULT_TENANT_DEMAND_POLICY } from '../crm/demand-policy.types';
import { SearchIndexService } from './search-index.service';

/** P0 FR-SRCH-009 — pause stale listings and remove from SERP. */
@Injectable()
export class SearchFreshnessJob {
  private readonly logger = new Logger(SearchFreshnessJob.name);

  constructor(
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    @InjectRepository(TenantDemandPolicyEntity)
    private readonly policies: Repository<TenantDemandPolicyEntity>,
    private readonly searchIndex: SearchIndexService,
  ) {}

  @Cron('0 30 4 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runNightly() {
    const tenantRows = await this.tenants.find({ where: { isActive: true }, take: 50 });
    for (const tenant of tenantRows) {
      await this.pauseStaleForTenant(tenant.id);
    }
  }

  async pauseStaleForTenant(tenantId: string) {
    const policyRow = await this.policies.findOne({ where: { tenantId } });
    const payload = policyRow?.payload ?? { ...DEFAULT_TENANT_DEMAND_POLICY };
    const maxDays = payload.search.listingFreshnessDays;
    const cutoff = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000);

    const stale = await this.listings
      .createQueryBuilder('l')
      .where('l.tenant_id = :tenantId', { tenantId })
      .andWhere('l.status = :status', { status: 'PUBLISHED' })
      .andWhere('l.freshness_paused_at IS NULL')
      .andWhere('l.updated_at < :cutoff', { cutoff })
      .getMany();

    for (const listing of stale) {
      listing.freshnessPausedAt = new Date();
      await this.listings.save(listing);
      await this.searchIndex.enqueue({
        tenantId,
        entityType: 'listing',
        entityId: listing.id,
        operation: 'DELETE',
        payload: { unitId: listing.unitId },
      });
    }

    if (stale.length) {
      this.logger.log(`Freshness pause ${tenantId}: ${stale.length} listings`);
    }
    return stale.length;
  }
}
