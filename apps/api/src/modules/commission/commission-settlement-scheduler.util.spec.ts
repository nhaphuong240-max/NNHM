import {
  DEFAULT_SETTLEMENT_SCHEDULE,
  shouldRunScheduledBatch,
} from './commission-settlement-scheduler.util';

describe('commission-settlement-scheduler.util', () => {
  it('skips when disabled', () => {
    expect(
      shouldRunScheduledBatch({ ...DEFAULT_SETTLEMENT_SCHEDULE, enabled: false }, 5),
    ).toEqual({ run: false, reason: 'schedule_disabled' });
  });

  it('skips when ready count below minimum', () => {
    expect(shouldRunScheduledBatch(DEFAULT_SETTLEMENT_SCHEDULE, 0)).toEqual({
      run: false,
      reason: 'ready_count_0_below_min_1',
    });
  });

  it('runs when enabled and ready count meets minimum', () => {
    expect(shouldRunScheduledBatch(DEFAULT_SETTLEMENT_SCHEDULE, 3)).toEqual({ run: true });
  });
});
