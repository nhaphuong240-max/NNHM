import {
  OMNICHANNEL_SLA_MS,
  computeSlaMs,
  percentile,
  summarizeLatencyMs,
} from './omnichannel-latency.util';

describe('omnichannel-latency.util', () => {
  it('computes percentiles', () => {
    const values = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    expect(percentile(values, 50)).toBe(500);
    expect(percentile(values, 95)).toBe(1000);
  });

  it('summarizes SLA pass when p95 under target', () => {
    const summary = summarizeLatencyMs([500, 1200, 800, 1500, 2000]);
    expect(summary.slaTargetMs).toBe(OMNICHANNEL_SLA_MS);
    expect(summary.slaPass).toBe(true);
    expect(summary.p95Ms).toBe(2000);
  });

  it('computes slaMs from channel timestamp', () => {
    const created = new Date('2026-07-01T10:00:00.000Z');
    const channel = new Date('2026-07-01T09:59:50.000Z');
    const processed = new Date('2026-07-01T10:00:05.000Z');
    const { ingestMs, slaMs } = computeSlaMs(processed, created, channel);
    expect(ingestMs).toBe(5000);
    expect(slaMs).toBe(15000);
  });
});
