import type { LeadEntity } from '../../database/entities/lead.entity';

export const SLA_HOURS = 48;
export const SLA_DUE_SOON_HOURS = 36;
export const SLA_TRACKED_STAGES: LeadEntity['status'][] = ['NEW', 'CONTACTED'];

export type SlaBucket = 'overdue' | 'due_soon' | 'ok';

export function idleMs(lead: Pick<LeadEntity, 'lastActivityAt' | 'updatedAt'>): number {
  const ref = lead.lastActivityAt ?? lead.updatedAt;
  return Date.now() - ref.getTime();
}

export function idleHours(lead: Pick<LeadEntity, 'lastActivityAt' | 'updatedAt'>): number {
  return idleMs(lead) / (60 * 60 * 1000);
}

export function computeSlaBucket(lead: Pick<LeadEntity, 'status' | 'lastActivityAt' | 'updatedAt'>): SlaBucket | null {
  if (!SLA_TRACKED_STAGES.includes(lead.status)) return null;
  const hours = idleHours(lead);
  if (hours >= SLA_HOURS) return 'overdue';
  if (hours >= SLA_DUE_SOON_HOURS) return 'due_soon';
  return 'ok';
}

export function slaHoursRemaining(lead: Pick<LeadEntity, 'status' | 'lastActivityAt' | 'updatedAt'>): number | null {
  const bucket = computeSlaBucket(lead);
  if (bucket === null) return null;
  return Math.max(0, SLA_HOURS - idleHours(lead));
}
