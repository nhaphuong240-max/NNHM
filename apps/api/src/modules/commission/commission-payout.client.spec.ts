import { ConfigService } from '@nestjs/config';
import { CommissionPayoutClient } from './commission-payout.client';
import { RailResolverService } from '../tenant-config/rail-resolver.service';

describe('CommissionPayoutClient', () => {
  const pilotLiveRails = {
    payoutEnabled: true,
    payoutStub: false,
  };

  function makeClient(env: Record<string, string>, railsOverlay?: Partial<typeof pilotLiveRails>) {
    const config = {
      get: jest.fn((key: string, fallback?: string) => env[key] ?? fallback),
    } as unknown as ConfigService;

    const rails = {
      resolve: jest.fn(async () => ({
        payoutEnabled: railsOverlay?.payoutEnabled ?? env.SETTLEMENT_PAYOUT_ENABLED === 'true',
        payoutStub:
          railsOverlay?.payoutStub ??
          (env.SETTLEMENT_PAYOUT_STUB === 'true' || env.SETTLEMENT_PAYOUT_ENABLED !== 'true'),
      })),
    } as unknown as RailResolverService;

    return { client: new CommissionPayoutClient(config, rails), rails };
  }

  it('skips payout when tenant payoutEnabled=false', async () => {
    const { client } = makeClient({}, { payoutEnabled: false, payoutStub: true });
    const result = await client.submitBatch({
      tenantId: 'ten_dev_01',
      runId: 'sr_test',
      lines: [{ entryId: 'ce_a', recipientId: 'usr_agent', amount: 1000 }],
    });

    expect(result.status).toBe('SKIPPED');
    expect(result.provider).toBe('internal-db-only');
  });

  it('submits stub payout when tenant payoutStub=true', async () => {
    const { client } = makeClient(
      { SETTLEMENT_PAYOUT_ENABLED: 'true', SETTLEMENT_PAYOUT_STUB: 'true' },
      { payoutEnabled: true, payoutStub: true },
    );
    const result = await client.submitBatch({
      tenantId: 'ten_dev_01',
      runId: 'sr_stub',
      lines: [{ entryId: 'ce_a', recipientId: 'usr_agent', amount: 1_750_000 }],
    });

    expect(result.status).toBe('SUBMITTED');
    expect(result.provider).toBe('payout-stub');
    expect(result.batchId).toBe('pay_sr_stub');
  });

  it('OPS-S5 — pilot tenant live payout uses partner rail when configured', async () => {
    const { client } = makeClient(
      {
        SETTLEMENT_PAYOUT_URL: 'https://payout.example/batch',
        SETTLEMENT_PAYOUT_API_KEY: 'secret',
      },
      pilotLiveRails,
    );

    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock as typeof fetch;

    const result = await client.submitBatch({
      tenantId: 'ten_pilot_cdt_01',
      runId: 'sr_pilot01',
      lines: [{ entryId: 'ce_pilot_agent01', recipientId: 'usr_pilot_agent', amount: 1_750_000 }],
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(result.status).toBe('SUBMITTED');
    expect(result.provider).toBe('partner-payout');
  });
});
