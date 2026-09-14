import type { ViewingEntity } from '../../database/entities/viewing.entity';
import { hasViewingSlotConflict } from './viewing-slot.util';

function viewing(partial: Partial<ViewingEntity>): ViewingEntity {
  return partial as ViewingEntity;
}

describe('viewing-slot.util', () => {
  it('detects overlapping confirmed slots for same agent', () => {
    const slot = new Date('2026-10-01T10:00:00Z');
    const candidate = viewing({
      id: 'vw_2',
      assignedTo: 'usr_agent_01',
      requestedSlot: new Date('2026-10-01T10:30:00Z'),
      status: 'CONFIRMED',
    });
    const existing = [
      viewing({
        id: 'vw_1',
        assignedTo: 'usr_agent_01',
        requestedSlot: slot,
        status: 'CONFIRMED',
      }),
    ];
    expect(hasViewingSlotConflict(candidate, existing)).not.toBeNull();
  });
});
