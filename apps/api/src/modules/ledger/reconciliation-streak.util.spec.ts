import {
  computeConsecutiveMatchedStreak,
  opWin02Passed,
} from './reconciliation-streak.util';

describe('reconciliation-streak.util', () => {
  it('counts consecutive MATCHED from most recent day', () => {
    const streak = computeConsecutiveMatchedStreak([
      { date: '2026-07-22', status: 'MATCHED' },
      { date: '2026-07-23', status: 'MATCHED' },
      { date: '2026-07-24', status: 'MISMATCH' },
      { date: '2026-07-25', status: 'MATCHED' },
      { date: '2026-07-26', status: 'MATCHED' },
      { date: '2026-07-27', status: 'MATCHED' },
      { date: '2026-07-28', status: 'MATCHED' },
    ]);
    expect(streak).toBe(4);
  });

  it('OP-WIN-02 passes at 7-day streak', () => {
    expect(opWin02Passed(7)).toBe(true);
    expect(opWin02Passed(6)).toBe(false);
  });
});
