import { createHash } from 'crypto';

export type CommissionExportJobStatus = 'PROCESSING' | 'READY' | 'FAILED';

export type CommissionExportJob = {
  id: string;
  dateFrom?: string;
  dateTo?: string;
  status: CommissionExportJobStatus;
  rowCount: number;
  csvSha256: string;
  createdAt: string;
  readyAt?: string;
  downloadExpiresAt?: string;
  error?: string;
};

export function buildCommissionExportJobMeta(input: {
  jobId: string;
  dateFrom?: string;
  dateTo?: string;
  csv: string;
  rowCount: number;
}): { job: CommissionExportJob; sha256: string } {
  const sha256 = createHash('sha256').update(input.csv, 'utf8').digest('hex');
  const createdAt = new Date().toISOString();
  const readyAt = new Date().toISOString();
  const downloadExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  return {
    sha256,
    job: {
      id: input.jobId,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      status: 'READY',
      rowCount: input.rowCount,
      csvSha256: sha256,
      createdAt,
      readyAt,
      downloadExpiresAt,
    },
  };
}
