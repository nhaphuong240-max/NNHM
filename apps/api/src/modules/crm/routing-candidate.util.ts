import type { UserEntity } from '../../database/entities/user.entity';
import type { ViewingEntity } from '../../database/entities/viewing.entity';

/** Phase B FR-LEAD-003b — skill / workload / calendar filters for routing. */
export const PROJECT_SKILL_TAGS: Record<string, string[]> = {
  prj_sunrise: ['high-rise', 'sunrise'],
};

export function requiredSkillsForLead(projectId?: string | null): string[] {
  if (!projectId?.trim()) return [];
  return PROJECT_SKILL_TAGS[projectId.trim()] ?? [];
}

export function agentMatchesSkills(agent: UserEntity, required: string[]): boolean {
  if (required.length === 0) return true;
  const tags = agent.skillTags ?? [];
  return required.some((t) => tags.includes(t));
}

export function agentWithinWorkload(openCount: number, maxOpenLeads?: number): boolean {
  if (!maxOpenLeads || maxOpenLeads <= 0) return true;
  return openCount < maxOpenLeads;
}

/** Agent has CONFIRMED/REQUESTED viewing within ±buffer of now. */
export function agentCalendarBusy(
  agentId: string,
  viewings: ViewingEntity[],
  now = new Date(),
  bufferMinutes = 30,
): boolean {
  const windowMs = bufferMinutes * 60 * 1000;
  const from = now.getTime() - windowMs;
  const to = now.getTime() + windowMs;

  return viewings.some((v) => {
    if (v.assignedTo !== agentId) return false;
    if (!['CONFIRMED', 'REQUESTED'].includes(v.status)) return false;
    if (!v.requestedSlot) return false;
    const t = v.requestedSlot.getTime();
    return t >= from && t <= to;
  });
}

export type RoutingFilterReason = 'skill' | 'workload' | 'calendar';

export function filterRoutingCandidates(input: {
  agents: UserEntity[];
  requiredSkills: string[];
  maxOpenLeads?: number;
  openLeadCounts: Map<string, number>;
  viewings: ViewingEntity[];
  now?: Date;
}): { eligible: UserEntity[]; excluded: Record<RoutingFilterReason, string[]> } {
  const excluded: Record<RoutingFilterReason, string[]> = {
    skill: [],
    workload: [],
    calendar: [],
  };

  let pool = [...input.agents];

  if (input.requiredSkills.length > 0) {
    const next = pool.filter((a) => agentMatchesSkills(a, input.requiredSkills));
    for (const a of pool) {
      if (!next.includes(a)) excluded.skill.push(a.id);
    }
    pool = next;
  }

  if (input.maxOpenLeads && input.maxOpenLeads > 0) {
    const next = pool.filter((a) =>
      agentWithinWorkload(input.openLeadCounts.get(a.id) ?? 0, input.maxOpenLeads),
    );
    for (const a of pool) {
      if (!next.includes(a)) excluded.workload.push(a.id);
    }
    pool = next;
  }

  const now = input.now ?? new Date();
  const next = pool.filter((a) => !agentCalendarBusy(a.id, input.viewings, now));
  for (const a of pool) {
    if (!next.includes(a)) excluded.calendar.push(a.id);
  }
  pool = next;

  return { eligible: pool, excluded };
}
