import { ApiWebhookDeliveryEntity } from '../../database/entities/api-webhook-delivery.entity';
import { ApiMarketplaceService } from '../api-marketplace/api-marketplace.service';
import { notaryJournalId } from './notary-webhook-journal';

describe('notary webhook journal', () => {
  const notice = {
    tenantId: 'ten_a',
    bookingId: 'bk_a',
    milestoneId: 'ms_contract',
    notarizationStatus: 'COMPLETED',
    contractRef: 'ref_a',
  };

  it('keeps one journal id for the same sandbox notice and another id when the status changes', () => {
    const first = notaryJournalId(notice);
    expect(first).toHaveLength(32);
    expect(notaryJournalId(notice)).toBe(first);
    expect(notaryJournalId({ ...notice, tenantId: 'ten_b' })).not.toBe(first);
    expect(notaryJournalId({ ...notice, notarizationStatus: 'REJECTED' })).not.toBe(first);
  });

  it('does not count a repeated notary notice a second time', async () => {
    const rows: ApiWebhookDeliveryEntity[] = [];
    const increment = jest.fn(async () => ({ affected: 1 }));
    const deliveries = {
      findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
        rows.find((row) => row.id === where.id && row.tenantId === where.tenantId) ?? null,
      ),
      save: jest.fn(async (row: ApiWebhookDeliveryEntity) => {
        rows.push(row);
        return row;
      }),
    };
    const service = new ApiMarketplaceService(
      { increment } as never,
      {} as never,
      deliveries as never,
      {} as never,
    );
    const journalId = notaryJournalId(notice);
    const first = await service.recordDeliveryOnce({
      tenantId: 'ten_a',
      partnerId: 'ptn_notary_stub',
      event: 'notary.status',
      status: 'DELIVERED',
      journalId,
      payload: { bookingId: 'bk_a' },
    });
    const second = await service.recordDeliveryOnce({
      tenantId: 'ten_a',
      partnerId: 'ptn_notary_stub',
      event: 'notary.status',
      status: 'DELIVERED',
      journalId,
      payload: { bookingId: 'bk_a' },
    });
    expect(first.replay).toBe(false);
    expect(second.replay).toBe(true);
    expect(second.delivery.id).toBe(first.delivery.id);
    expect(rows).toHaveLength(1);
    expect(increment).toHaveBeenCalledTimes(1);
    const otherTenant = await service.recordDeliveryOnce({
      tenantId: 'ten_b',
      partnerId: 'ptn_notary_stub',
      event: 'notary.status',
      status: 'DELIVERED',
      journalId: notaryJournalId({ ...notice, tenantId: 'ten_b' }),
      payload: { bookingId: 'bk_a' },
    });
    expect(otherTenant.replay).toBe(false);
    expect(otherTenant.delivery.tenantId).toBe('ten_b');
    expect(otherTenant.delivery.id).not.toBe(journalId);
  });
});
