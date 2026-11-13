import { createHash } from 'crypto';

/** Stable id for one sandbox notary notice. Fits api_webhook_deliveries.id varchar(32). */
export function notaryJournalId(input: {
  tenantId: string;
  bookingId: string;
  milestoneId: string;
  notarizationStatus: string;
  contractRef: string;
}): string {
  const canonical = [
    input.tenantId.trim(),
    input.bookingId.trim(),
    input.milestoneId.trim(),
    input.notarizationStatus.trim(),
    input.contractRef.trim(),
  ].join('\n');
  return `nry_${createHash('sha256').update(canonical).digest('hex').slice(0, 28)}`;
}
