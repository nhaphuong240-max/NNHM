import { Link } from 'react-router-dom';
import { brand, formatPrice } from '../../theme/tokens';

type Props = {
  price: number;
  onContact: () => void;
  holdHref: string;
};

export function StickyContactBar({ price, onContact, holdHref }: Props) {
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t px-4 py-3 flex items-center gap-3"
      style={{ background: brand.surface, borderColor: brand.border }}
    >
      <p className="text-sm font-bold flex-1 min-w-0 truncate" style={{ color: brand.primary }}>
        {formatPrice(price)}
      </p>
      <button
        type="button"
        className="rounded-xl px-4 py-2.5 text-sm font-bold text-white shrink-0"
        style={{ background: brand.primary }}
        onClick={onContact}
      >
        Liên hệ
      </button>
      <Link
        to={holdHref}
        className="rounded-xl px-4 py-2.5 text-sm font-bold no-underline shrink-0"
        style={{ background: brand.hover, color: brand.primaryDark }}
      >
        Giữ chỗ
      </Link>
    </div>
  );
}
