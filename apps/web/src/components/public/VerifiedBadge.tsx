import { brand } from '../../theme/tokens';

export function VerifiedBadge() {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
      style={{ background: brand.hover, color: brand.success }}
    >
      Verified
    </span>
  );
}
