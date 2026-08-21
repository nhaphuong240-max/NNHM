import { Link } from 'react-router-dom';
import { usePublicBrand } from '../../context/PublicBrandContext';
import { brandPrimary } from '../../lib/apply-brand-theme';
import { brand } from '../../theme/tokens';

export function PostPropertyCta() {
  return (
    <section
      className="rounded-[1.75rem] p-7 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5"
      style={{ background: brand.primaryDark, color: '#F4EFE6' }}
      data-testid="post-property-cta"
    >
      <div>
        <p className="nnhn-kicker mb-2" style={{ color: '#E8C4A8' }}>
          Đối tác CĐT
        </p>
        <h2 className="nnhn-display text-2xl sm:text-3xl">Đăng tin miễn phí</h2>
        <p className="text-sm mt-2 max-w-md opacity-80">
          Chủ đầu tư và môi giới — đăng bảng hàng GR, duyệt listing và nhận lead từ marketplace.
        </p>
      </div>
      <Link
        to="/auth/login?portal=developer"
        className="shrink-0 rounded-full px-6 py-3 text-sm font-bold no-underline text-center"
        style={{ background: brand.claySoft, color: brand.primaryDark }}
      >
        Đăng nhập CĐT / Agent
      </Link>
    </section>
  );
}

export function PostPropertyLink({ className = '', inheritColor = false }: { className?: string; inheritColor?: boolean }) {
  const publicBrand = usePublicBrand();
  return (
    <Link
      to="/auth/login?portal=developer"
      className={`font-semibold no-underline hover:underline ${className}`}
      style={inheritColor ? undefined : { color: brandPrimary(publicBrand) }}
    >
      Đăng tin miễn phí
    </Link>
  );
}
