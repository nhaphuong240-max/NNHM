import { mapApiLead, parseCachedLeads } from './leadsCache';

describe('leadsCache', () => {
  it('parseCachedLeads returns null for invalid json', () => {
    expect(parseCachedLeads(null)).toBeNull();
    expect(parseCachedLeads('not-json')).toBeNull();
    expect(parseCachedLeads('{}')).toBeNull();
  });

  it('parseCachedLeads reads valid payload', () => {
    const payload = {
      meta: { syncedAt: '2026-07-28T10:00:00.000Z' },
      leads: [
        {
          id: 'ld_01',
          fullName: 'Thu Trang',
          phone: '+8490',
          score: 90,
          tier: 'HOT' as const,
          source: 'PUBLIC_FORM',
          updatedAt: '2026-07-28T09:00:00.000Z',
        },
      ],
    };
    expect(parseCachedLeads(JSON.stringify(payload))?.leads).toHaveLength(1);
  });

  it('mapApiLead maps OpenAPI row shape', () => {
    const lead = mapApiLead({
      id: 'ld_01',
      attributes: {
        fullName: 'A',
        phone: '1',
        score: 1,
        tier: 'NEW',
        source: 'X',
        updatedAt: 't',
      },
    });
    expect(lead.fullName).toBe('A');
    expect(lead.tier).toBe('NEW');
  });
});
