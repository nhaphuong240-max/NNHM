export type SettlementScheduleConfig = {
  enabled: boolean;
  cronLabel: string;
  timezone: string;
  minReadyLines: number;
  lastRunAt?: string;
  lastRunStatus?: 'SKIPPED' | 'COMPLETED' | 'FAILED';
  lastRunId?: string;
  lastError?: string;
};

export const DEFAULT_SETTLEMENT_SCHEDULE: SettlementScheduleConfig = {
  enabled: true,
  cronLabel: '0 7 * * 1',
  timezone: 'Asia/Ho_Chi_Minh',
  minReadyLines: 1,
};

export function shouldRunScheduledBatch(
  config: SettlementScheduleConfig,
  readyCount: number,
): { run: boolean; reason?: string } {
  if (!config.enabled) return { run: false, reason: 'schedule_disabled' };
  if (readyCount < config.minReadyLines) {
    return { run: false, reason: `ready_count_${readyCount}_below_min_${config.minReadyLines}` };
  }
  return { run: true };
}
