import { brand } from '../../theme/tokens';

export function VerifiedBadge() {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
      style={{ background: brand.hover, color: brand.primaryDark }}
    >
      Verified
    </span>
  );
}
