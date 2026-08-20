import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RailResolverService } from '../tenant-config/rail-resolver.service';

export type PayoutLineInput = {
  entryId: string;
  recipientId: string;
  amount: number;
};

export type PayoutBatchResult = {
  batchId: string;
  status: 'SUBMITTED' | 'SKIPPED';
  provider: string;
  lineCount: number;
  totalAmount: number;
};

@Injectable()
export class CommissionPayoutClient {
  private readonly logger = new Logger(CommissionPayoutClient.name);

  constructor(
    private readonly config: ConfigService,
    private readonly rails: RailResolverService,
  ) {}

  /** OPS-S5-01 — tenant LIVE_RAILS.payoutEnabled wins over SETTLEMENT_PAYOUT_ENABLED env. */
  async isEnabled(tenantId: string): Promise<boolean> {
    const resolved = await this.rails.resolve(tenantId);
    return resolved.payoutEnabled;
  }

  async isStubMode(tenantId: string): Promise<boolean> {
    const resolved = await this.rails.resolve(tenantId);
    return resolved.payoutStub;
  }

  async isLiveConfigured(tenantId: string): Promise<boolean> {
    return (
      (await this.isEnabled(tenantId)) &&
      !(await this.isStubMode(tenantId)) &&
      Boolean(this.config.get<string>('SETTLEMENT_PAYOUT_URL')) &&
      Boolean(this.config.get<string>('SETTLEMENT_PAYOUT_API_KEY'))
    );
  }

  async payoutMeta(tenantId?: string) {
    const enabled = tenantId ? await this.isEnabled(tenantId) : this.envPayoutEnabled();
    const stubMode = tenantId ? await this.isStubMode(tenantId) : this.envPayoutStub();
    const liveConfigured = tenantId ? await this.isLiveConfigured(tenantId) : false;

    return {
      enabled,
      stubMode,
      liveConfigured,
      provider: enabled ? (stubMode ? 'payout-stub' : 'partner-payout') : 'internal-db-only',
      tenantScoped: Boolean(tenantId),
    };
  }

  /** UC-PAY-04 Phase 2 — bank/split payout rail (pilot HTTP adapter) */
  async submitBatch(input: {
    tenantId: string;
    runId: string;
    lines: PayoutLineInput[];
  }): Promise<PayoutBatchResult> {
    const totalAmount = input.lines.reduce((sum, line) => sum + line.amount, 0);
    const batchId = `pay_${input.runId}`;

    if (!(await this.isEnabled(input.tenantId))) {
      this.logger.log(
        `Settlement payout skipped (payoutEnabled=false) run=${input.runId} tenant=${input.tenantId}`,
      );
      return {
        batchId,
        status: 'SKIPPED',
        provider: 'internal-db-only',
        lineCount: input.lines.length,
        totalAmount,
      };
    }

    if (await this.isStubMode(input.tenantId)) {
      this.logger.log(
        `Settlement payout stub SUBMITTED ${batchId} · ${input.lines.length} lines (tenant payoutStub)`,
      );
      return {
        batchId,
        status: 'SUBMITTED',
        provider: 'payout-stub',
        lineCount: input.lines.length,
        totalAmount,
      };
    }

    const url = this.config.get<string>('SETTLEMENT_PAYOUT_URL');
    const apiKey = this.config.get<string>('SETTLEMENT_PAYOUT_API_KEY');
    if (!url || !apiKey) {
      throw new Error(
        'SETTLEMENT_PAYOUT_URL and SETTLEMENT_PAYOUT_API_KEY required when payout live (or payoutStub=true on tenant)',
      );
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        tenantId: input.tenantId,
        runId: input.runId,
        batchId,
        lines: input.lines,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Settlement payout failed (${res.status}): ${body.slice(0, 200)}`);
    }

    this.logger.log(`Settlement payout submitted ${batchId} · ${input.lines.length} lines`);
    return {
      batchId,
      status: 'SUBMITTED',
      provider: 'partner-payout',
      lineCount: input.lines.length,
      totalAmount,
    };
  }

  private envPayoutEnabled(): boolean {
    return this.config.get<string>('SETTLEMENT_PAYOUT_ENABLED', 'false') === 'true';
  }

  private envPayoutStub(): boolean {
    return this.config.get<string>('SETTLEMENT_PAYOUT_STUB', 'false') === 'true';
  }
}
