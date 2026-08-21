import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SEED_TENANT_ID } from '../../database/database.seed.service';
import { SearchIndexService } from './search-index.service';

@Injectable()
export class SearchIndexWorker implements OnModuleInit {
  private readonly logger = new Logger(SearchIndexWorker.name);
  private bootstrapped = false;
  private reconcileTicks = 0;

  constructor(
    private readonly index: SearchIndexService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const tenantId = this.config.get<string>('DEFAULT_TENANT_ID', SEED_TENANT_ID);
    const status = await this.index.getStatus(tenantId);
    if (status.docCount === 0) {
      const count = await this.index.rebuildPublished(tenantId);
      if (count > 0) {
        this.logger.log(`UC-LS-07 bootstrap — queued ${count} published listing(s) for search index`);
      }
    }
    this.bootstrapped = true;
  }

  /** Poll outbox every 500ms — T4-S2 target lag <500ms (enqueue also syncs immediately) */
  @Interval(500)
  async pollOutbox() {
    if (!this.bootstrapped) return;
    const processed = await this.index.processPending(25);
    if (processed > 0) {
      this.logger.debug(`Search index worker processed ${processed} outbox row(s)`);
    }
  }

  /** P1 — reconcile index when seed adds listings after bootstrap (avoids empty SERP race) */
  @Interval(5000)
  async reconcilePublishedDocs() {
    if (!this.bootstrapped || this.reconcileTicks >= 24) return;
    this.reconcileTicks += 1;

    const tenantId = this.config.get<string>('DEFAULT_TENANT_ID', SEED_TENANT_ID);
    const [published, status] = await Promise.all([
      this.index.countIndexablePublished(tenantId),
      this.index.getStatus(tenantId),
    ]);

    if (published > status.docCount) {
      const queued = await this.index.rebuildPublished(tenantId);
      this.logger.log(
        `UC-LS-07 reconcile — ${published} indexable listing(s), ${status.docCount} doc(s); queued ${queued}`,
      );
    }
  }
}
