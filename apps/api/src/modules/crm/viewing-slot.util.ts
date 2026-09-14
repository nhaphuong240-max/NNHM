import type { ViewingEntity } from '../../database/entities/viewing.entity';

const DEFAULT_BUFFER_MINUTES = 30;
const DEFAULT_SLOT_MINUTES = 60;

export function viewingWindow(
  slot: Date,
  bufferMinutes = DEFAULT_BUFFER_MINUTES,
  slotMinutes = DEFAULT_SLOT_MINUTES,
): { start: Date; end: Date } {
  const start = new Date(slot.getTime() - bufferMinutes * 60 * 1000);
  const end = new Date(slot.getTime() + slotMinutes * 60 * 1000 + bufferMinutes * 60 * 1000);
  return { start, end };
}

export function windowsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** P0 FR-VIEW-001b — detect agent calendar conflict. */
export function hasViewingSlotConflict(
  candidate: ViewingEntity,
  existing: ViewingEntity[],
  bufferMinutes = DEFAULT_BUFFER_MINUTES,
): ViewingEntity | null {
  if (!candidate.requestedSlot || !candidate.assignedTo) return null;
  const agentId = candidate.assignedTo;
  const candWin = viewingWindow(candidate.requestedSlot, bufferMinutes);

  for (const row of existing) {
    if (row.id === candidate.id) continue;
    if (row.assignedTo !== agentId) continue;
    if (!['CONFIRMED', 'REQUESTED'].includes(row.status)) continue;
    if (!row.requestedSlot) continue;
    const win = viewingWindow(row.requestedSlot, bufferMinutes);
    if (windowsOverlap(candWin.start, candWin.end, win.start, win.end)) {
      return row;
    }
  }
  return null;
}
