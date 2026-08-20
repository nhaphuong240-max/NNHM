import { parseActivityLog } from './activityLog';

describe('activityLog', () => {
  it('parseActivityLog rejects invalid payload', () => {
    expect(parseActivityLog(null)).toBeNull();
    expect(parseActivityLog('{}')).toBeNull();
  });

  it('parseActivityLog reads entries', () => {
    const payload = {
      meta: { updatedAt: '2026-07-28T10:00:00.000Z' },
      entries: [
        {
          id: 'mob_1',
          leadId: 'ld_01',
          latitude: 10.77,
          longitude: 106.69,
          status: 'queued' as const,
          createdAt: '2026-07-28T09:00:00.000Z',
        },
      ],
    };
    expect(parseActivityLog(JSON.stringify(payload))?.entries).toHaveLength(1);
  });
});
