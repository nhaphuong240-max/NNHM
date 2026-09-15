import type { UserEntity } from '../../database/entities/user.entity';
import type { ViewingEntity } from '../../database/entities/viewing.entity';
import {
  agentCalendarBusy,
  agentMatchesSkills,
  filterRoutingCandidates,
} from './routing-candidate.util';

describe('routing-candidate.util', () => {
  const agentA = { id: 'a1', skillTags: ['high-rise'] } as UserEntity;
  const agentB = { id: 'a2', skillTags: ['luxury'] } as UserEntity;

  it('matches skill tags', () => {
    expect(agentMatchesSkills(agentA, ['high-rise'])).toBe(true);
    expect(agentMatchesSkills(agentB, ['high-rise'])).toBe(false);
  });

  it('detects calendar busy', () => {
    const now = new Date('2026-09-15T10:00:00+07:00');
    const viewings = [
      {
        assignedTo: 'a1',
        status: 'CONFIRMED',
        requestedSlot: new Date('2026-09-15T10:15:00+07:00'),
      },
    ] as ViewingEntity[];
    expect(agentCalendarBusy('a1', viewings, now)).toBe(true);
    expect(agentCalendarBusy('a2', viewings, now)).toBe(false);
  });

  it('filters by skill, workload, calendar', () => {
    const counts = new Map([
      ['a1', 20],
      ['a2', 2],
    ]);
    const { eligible, excluded } = filterRoutingCandidates({
      agents: [agentA, agentB],
      requiredSkills: ['high-rise'],
      maxOpenLeads: 15,
      openLeadCounts: counts,
      viewings: [],
    });
    expect(eligible.map((a) => a.id)).toEqual([]);
    expect(excluded.skill).toContain('a2');
    expect(excluded.workload).toContain('a1');
  });
});
