import {
  buildVersionHistoryFromAudit,
  snapshotAtTime,
  versionsToCsv,
} from './gr-time-travel.util';

describe('gr-time-travel.util', () => {
  const current = {
    basePrice: '3850000000',
    status: 'AVAILABLE' as const,
    version: 3,
    updatedAt: new Date('2026-07-28T10:00:00.000Z'),
  };

  it('builds version history from PATCH audit events', () => {
    const entries = buildVersionHistoryFromAudit(
      [
        {
          id: '1',
          action: 'PATCH',
          actorId: 'usr_dev_admin',
          createdAt: new Date('2026-07-01T08:00:00.000Z'),
          payload: {
            reason: 'Phase 1 adjust',
            before: { basePrice: '3600000000', status: 'AVAILABLE', version: 1 },
            after: { basePrice: '3750000000', status: 'AVAILABLE', version: 2 },
          },
        },
        {
          id: '2',
          action: 'PATCH',
          actorId: 'usr_dev_admin',
          createdAt: new Date('2026-07-15T08:00:00.000Z'),
          payload: {
            reason: 'Market index',
            before: { basePrice: '3750000000', status: 'AVAILABLE', version: 2 },
            after: { basePrice: '3850000000', status: 'AVAILABLE', version: 3 },
          },
        },
      ],
      current,
    );

    expect(entries).toHaveLength(2);
    expect(entries[0].version).toBe(3);
    expect(entries[1].version).toBe(2);
  });

  it('returns snapshot at historical timestamp', () => {
    const entries = buildVersionHistoryFromAudit(
      [
        {
          id: '1',
          action: 'PATCH',
          actorId: 'usr_dev_admin',
          createdAt: new Date('2026-07-01T08:00:00.000Z'),
          payload: {
            reason: 'Phase 1 adjust',
            before: { basePrice: '3600000000', status: 'AVAILABLE', version: 1 },
            after: { basePrice: '3750000000', status: 'AVAILABLE', version: 2 },
          },
        },
        {
          id: '2',
          action: 'PATCH',
          actorId: 'usr_dev_admin',
          createdAt: new Date('2026-07-15T08:00:00.000Z'),
          payload: {
            reason: 'Market index',
            before: { basePrice: '3750000000', status: 'AVAILABLE', version: 2 },
            after: { basePrice: '3850000000', status: 'AVAILABLE', version: 3 },
          },
        },
      ],
      current,
    );

    const snapshot = snapshotAtTime(entries, '2026-07-10T12:00:00.000Z', {
      id: 'un_01',
      code: 'A-12-05',
    });

    expect(snapshot?.basePrice).toBe(3750000000);
    expect(snapshot?.version).toBe(2);
  });

  it('exports CSV rows', () => {
    const csv = versionsToCsv('A-12-05', [
      {
        version: 2,
        basePrice: 3750000000,
        status: 'AVAILABLE',
        changedAt: '2026-07-01T08:00:00.000Z',
        changedBy: 'usr_dev_admin',
        reason: 'Phase 1 adjust',
        action: 'PATCH',
        auditEventId: '1',
      },
    ]);

    expect(csv).toContain('unit_code');
    expect(csv).toContain('A-12-05');
    expect(csv).toContain('3750000000');
  });
});
