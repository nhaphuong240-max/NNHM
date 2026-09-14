import { brand } from '../../theme/tokens';

const LEVEL_LABEL: Record<string, string> = {
  V0: 'Chưa xác minh',
  V1: 'Ảnh GR',
  V2: 'Verified',
  V3: 'Anti-drift',
  V4: 'CĐT duyệt',
};

/** P1 FR-PRP-004b — V0–V4 + legal disclaimer (không bảo đảm pháp lý). */
export function VerificationTrustBadge({ level = 'V2' }: { level?: string }) {
  const label = LEVEL_LABEL[level] ?? level;
  return (
    <div className="space-y-1">
      <span
        className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full inline-block"
        style={{ background: brand.hover, color: brand.primaryDark }}
      >
        {level} · {label}
      </span>
      <p className="text-[10px] leading-snug" style={{ color: brand.muted }}>
        Mức xác minh kỹ thuật — không phải cam kết pháp lý hay bảo đảm sổ hồng.
      </p>
    </div>
  );
}
