import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { LeadScoringService } from './lead-scoring.service';

@Injectable()
export class LeadScoringWorker {
  private readonly logger = new Logger(LeadScoringWorker.name);

  constructor(private readonly scoring: LeadScoringService) {}

  /** UC-AI-02 — poll every 1s, target inference ≤2s (NFR-P06) */
  @Interval(1000)
  async pollOutbox() {
    const processed = await this.scoring.processPending(25);
    if (processed > 0) {
      this.logger.debug(`Lead scoring worker processed ${processed} job(s)`);
    }
  }
}
