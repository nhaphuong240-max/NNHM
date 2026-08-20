import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScheduleLeaderService } from '../../infrastructure/redis/schedule-leader.service';
import { TenantWebhookRetryService } from './tenant-webhook-retry.service';
import { TenantWebhookService } from './tenant-webhook.service';

@Injectable()
export class TenantWebhookRetryJob {
  private readonly logger = new Logger(TenantWebhookRetryJob.name);

  constructor(
    private readonly retry: TenantWebhookRetryService,
    private readonly webhooks: TenantWebhookService,
    private readonly scheduleLeader: ScheduleLeaderService,
  ) {}

  /** UC-NW-05 Phase 2 — drain failed webhook retries every 30s */
  @Cron('*/30 * * * * *')
  async processRetries() {
    if (!(await this.scheduleLeader.isLeader('webhook-retry', 25))) return;
    const deliveries = await this.retry.processDue((payload) =>
      this.webhooks.retryDelivery(payload),
    );

    for (const delivery of deliveries) {
      if (delivery.status === 'DELIVERED') {
        this.logger.log(`Webhook retry succeeded ${delivery.id} attempt=${delivery.attempt}`);
      }
    }
  }
}
