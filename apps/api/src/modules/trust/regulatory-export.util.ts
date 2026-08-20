import { createHash } from 'crypto';
import { encryptionLabel } from './regulatory-export-crypto.util';

export type RegulatoryExportScope = 'AUDIT' | 'BOOKINGS' | 'FULL' | 'ESCROW_NHNN';

export type RegulatoryExportJob = {
  id: string;
  scope: RegulatoryExportScope;
  dateFrom: string;
  dateTo: string;
  status: 'QUEUED' | 'COMPILING' | 'READY' | 'FAILED';
  manifestSha256?: string;
  fileCount: number;
  createdAt: string;
  readyAt?: string;
  downloadExpiresAt?: string;
};

export function buildRegulatoryManifest(input: {
  jobId: string;
  tenantId: string;
  scope: RegulatoryExportScope;
  auditCount: number;
  bookingCount: number;
  paymentCount: number;
  escrowCount?: number;
  encryptionStub?: boolean;
}): { manifest: Record<string, unknown>; sha256: string; csv: string } {
  const manifest = {
    jobId: input.jobId,
    tenantId: input.tenantId,
    scope: input.scope,
    generatedAt: new Date().toISOString(),
    counts: {
      auditEvents: input.auditCount,
      bookings: input.bookingCount,
      payments: input.paymentCount,
      escrowAccounts: input.escrowCount ?? 0,
    },
    escrowScope: input.scope === 'ESCROW_NHNN' ? 'NHNN_SBV_PILOT' : undefined,
    encryption: encryptionLabel(input.encryptionStub ?? true),
    retentionClass: '7Y',
  };

  const json = JSON.stringify(manifest, null, 2);
  const sha256 = createHash('sha256').update(json).digest('hex');
  const csv = [
    'section,count',
    `audit,${input.auditCount}`,
    `bookings,${input.bookingCount}`,
    `payments,${input.paymentCount}`,
    `escrow,${input.escrowCount ?? 0}`,
    `manifest_sha256,${sha256}`,
  ].join('\n');

  return { manifest, sha256, csv };
}
