import { brand } from '../theme/tokens';

export type DriftFinding = {
  field: string;
  severity: 'PASS' | 'FLAG' | 'BLOCK';
  message: string;
  grValue?: string | number;
  listingValue?: string | number;
};

export type DriftReport = {
  status: 'PASS' | 'FLAG' | 'BLOCK';
  findings: DriftFinding[];
  checkedAt?: string;
  unitCode?: string;
  basePrice?: number;
};

export function driftColor(status: string) {
  switch (status) {
    case 'PASS':
      return brand.success;
    case 'FLAG':
      return brand.warning;
    case 'BLOCK':
      return brand.destructive;
    default:
      return brand.muted;
  }
}

export function DriftPanel({ report }: { report: DriftReport | null }) {
  if (!report) return null;

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        border: `2px solid ${driftColor(report.status)}`,
        background: report.status === 'BLOCK' ? '#FEF2F2' : brand.surface,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Anti-drift · UC-GR-03</p>
        <span
          className="text-xs font-bold px-2 py-1 rounded text-white"
          style={{ background: driftColor(report.status) }}
        >
          {report.status}
        </span>
      </div>
      {report.basePrice !== undefined && (
        <p className="text-sm" style={{ color: brand.muted }}>
          GR giá gốc: {report.basePrice.toLocaleString('vi-VN')} VND
          {report.unitCode ? ` · ${report.unitCode}` : ''}
        </p>
      )}
      {report.findings.length === 0 ? (
        <p className="text-sm" style={{ color: brand.success }}>
          Khớp Golden Record — có thể gửi duyệt.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {report.findings.map((f, i) => (
            <li key={`${f.field}-${i}`} className="rounded-lg p-2" style={{ background: '#fff' }}>
              <span className="font-medium" style={{ color: driftColor(f.severity) }}>
                [{f.severity}]
              </span>{' '}
              {f.message}
              {f.grValue !== undefined && (
                <span className="block text-xs mt-1" style={{ color: brand.muted }}>
                  GR: {String(f.grValue)}
                  {f.listingValue !== undefined ? ` · Listing: ${String(f.listingValue)}` : ''}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
