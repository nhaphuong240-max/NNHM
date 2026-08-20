import {
  buildDefaultMilestones,
  releaseMilestone,
  syncMilestonesWithBooking,
} from './payment-escrow.util';

describe('payment-escrow.util', () => {
  it('syncs deposit milestone when booking DEPOSITED', () => {
    const milestones = syncMilestonesWithBooking(buildDefaultMilestones(1_000_000_000), 'DEPOSITED');
    expect(milestones[0]?.status).toBe('MET');
    expect(milestones[1]?.status).toBe('MET');
    expect(milestones[2]?.status).toBe('PENDING');
  });

  it('releases MET milestone and updates held amount', () => {
    const milestones = syncMilestonesWithBooking(buildDefaultMilestones(1_000_000_000), 'DEPOSITED');
    const account = {
      id: 'esc_test',
      bookingId: 'bk_01',
      totalAmount: 1_000_000_000,
      heldAmount: 1_000_000_000,
      releasedAmount: 0,
      status: 'ACTIVE' as const,
      milestones,
      createdAt: new Date().toISOString(),
    };
    const updated = releaseMilestone(account, milestones[0]!.id);
    expect(updated.releasedAmount).toBeGreaterThan(0);
    expect(updated.milestones[0]?.status).toBe('RELEASED');
  });

  it('blocks release when milestone still PENDING', () => {
    const milestones = buildDefaultMilestones(1_000_000_000);
    const account = {
      id: 'esc_test',
      bookingId: 'bk_01',
      totalAmount: 1_000_000_000,
      heldAmount: 1_000_000_000,
      releasedAmount: 0,
      status: 'ACTIVE' as const,
      milestones,
      createdAt: new Date().toISOString(),
    };
    expect(() => releaseMilestone(account, milestones[0]!.id)).toThrow();
  });
});
