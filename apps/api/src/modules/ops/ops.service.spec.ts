import { OpsService } from './ops.service';
import type { InventoryLockService } from '../../infrastructure/redis/inventory-lock.service';
import type { ReconciliationService } from '../ledger/reconciliation.service';

describe('OpsService', () => {
  const intents = {
    find: jest.fn(),
  };
  const listings = {
    find: jest.fn(),
  };
  const locks: Pick<InventoryLockService, 'getMetrics' | 'listActiveLocks'> = {
    getMetrics: jest.fn(),
    listActiveLocks: jest.fn(),
  };
  const reconciliation: Pick<ReconciliationService, 'getReports'> = {
    getReports: jest.fn(),
  };

  const service = new OpsService(
    intents as never,
    listings as never,
    locks as never,
    reconciliation as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 4 widgets with deep links and runbook anchors', async () => {
    intents.find.mockResolvedValue([
      {
        id: 'pi_stuck',
        bookingId: 'bk_01',
        expiresAt: new Date(Date.now() - 60_000),
        createdAt: new Date(Date.now() - 60_000),
      },
    ]);
    listings.find.mockResolvedValue([
      { id: 'ls_block', unitId: 'un_01', title: 'A-12-05 lệch giá' },
    ]);
    (locks.getMetrics as jest.Mock).mockResolvedValue({ acquired: 4, contention: 1 });
    (locks.listActiveLocks as jest.Mock).mockResolvedValue([
      { unitId: 'un_02', bookingId: 'bk_02', ttlSeconds: 40 },
    ]);
    (reconciliation.getReports as jest.Mock).mockResolvedValue([
      { date: '2026-08-19', attributes: { status: 'MISMATCH' } },
      { date: '2026-08-20', attributes: { status: 'MATCHED' } },
    ]);

    const result = await service.snapshot('ten_pilot_cdt_01');
    expect(result.data.widgets).toHaveLength(4);
    expect(result.data.healthy).toBe(false);
    expect(result.data.widgets.map((w) => w.id)).toEqual([
      'stuckPayments',
      'lockTtl',
      'driftBlock',
      'reconcileMismatch',
    ]);
    expect(result.data.widgets[0].count).toBe(1);
    expect(result.data.widgets[0].deepLink).toBe('/admin/payment-gateways');
    expect(result.data.widgets[2].deepLink).toBe('/admin/moderation');
    expect(result.data.widgets[3].count).toBe(1);
    expect(result.data.widgets[3].deepLink).toBe('/finance/reconciliation');
    expect(result.meta.uc).toContain('OPS-S3-01');
  });

  it('marks console healthy when all queues empty', async () => {
    intents.find.mockResolvedValue([]);
    listings.find.mockResolvedValue([]);
    (locks.getMetrics as jest.Mock).mockResolvedValue({ acquired: 0, contention: 0 });
    (locks.listActiveLocks as jest.Mock).mockResolvedValue([]);
    (reconciliation.getReports as jest.Mock).mockResolvedValue([
      { date: '2026-08-20', attributes: { status: 'MATCHED' } },
    ]);

    const result = await service.snapshot('ten_dev_01');
    expect(result.data.healthy).toBe(true);
    expect(result.data.widgets.every((w) => w.severity === 'ok')).toBe(true);
  });
});
