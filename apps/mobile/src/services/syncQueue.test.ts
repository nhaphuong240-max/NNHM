import { createClientRequestId, parseSyncQueue } from './syncQueue';

describe('syncQueue', () => {
  it('parseSyncQueue returns null for invalid json', () => {
    expect(parseSyncQueue(null)).toBeNull();
    expect(parseSyncQueue('{}')).toBeNull();
  });

  it('parseSyncQueue reads valid payload', () => {
    const payload = {
      meta: { updatedAt: '2026-07-28T10:00:00.000Z' },
      items: [
        {
          id: 'mob_1',
          kind: 'activity' as const,
          createdAt: '2026-07-28T09:00:00.000Z',
          payload: {
            leadId: 'ld_01',
            type: 'VISIT' as const,
            summary: 'GPS',
            metadata: {
              latitude: 10.77,
              longitude: 106.69,
              source: 'mobile-gps' as const,
              clientRequestId: 'mob_1',
            },
          },
        },
      ],
    };
    expect(parseSyncQueue(JSON.stringify(payload))?.items).toHaveLength(1);
  });

  it('createClientRequestId is unique-ish', () => {
    const a = createClientRequestId();
    const b = createClientRequestId();
    expect(a).toMatch(/^mob_/);
    expect(a).not.toBe(b);
  });
});
