import { sortThreads, type InboxThread } from './crm-inbox.util';

describe('crm-inbox.util', () => {
  it('sorts unread omnichannel before read WEB (OPS-S4-03)', () => {
    const threads: InboxThread[] = [
      {
        id: 'inb_1',
        leadId: 'ld_1',
        leadName: 'CSV Lead',
        channel: 'WEB',
        preview: 'CSV_IMPORT',
        unread: false,
        lastMessageAt: '2026-08-20T12:00:00.000Z',
        status: 'NEW',
      },
      {
        id: 'inb_2',
        leadId: 'ld_2',
        leadName: 'Zalo Lead',
        channel: 'ZALO',
        preview: 'Zalo OA',
        unread: true,
        lastMessageAt: '2026-08-20T10:00:00.000Z',
        status: 'NEW',
      },
    ];

    const sorted = sortThreads(threads);
    expect(sorted[0].channel).toBe('ZALO');
    expect(sorted[0].unread).toBe(true);
  });
});
