import type { TenantDemandPolicyPayload } from './demand-policy.types';
import { BusinessErrorCode, throwBusinessError } from '../../common/business-error';

/** ISO date YYYY-MM-DD in policy timezone (approx via locale string). */
function localDateKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function localParts(date: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { weekday: dayMap[weekday] ?? 0, hour, minute };
}

function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function isBusinessTime(
  at: Date,
  sla: TenantDemandPolicyPayload['sla'],
): boolean {
  const dateKey = localDateKey(at, sla.timezone);
  if (sla.holidayDates.includes(dateKey)) return false;
  const { weekday, hour, minute } = localParts(at, sla.timezone);
  if (!sla.businessDays.includes(weekday)) return false;
  const mins = hour * 60 + minute;
  return mins >= parseHm(sla.businessHours.start) && mins < parseHm(sla.businessHours.end);
}

export function assertSlaApplicable(
  at: Date,
  policy: TenantDemandPolicyPayload,
): void {
  if (!isBusinessTime(at, policy.sla)) {
    throwBusinessError(
      BusinessErrorCode.SLA_NOT_APPLICABLE,
      'First-touch HOT SLA applies only during configured business hours',
      { timezone: policy.sla.timezone, at: at.toISOString() },
    );
  }
}

export function hotFirstTouchDeadline(
  leadCreatedAt: Date,
  policy: TenantDemandPolicyPayload,
): Date {
  return new Date(leadCreatedAt.getTime() + policy.sla.hotFirstTouchMinutes * 60 * 1000);
}
