import { Link } from 'react-router-dom';
import { usePublicBrand } from '../../context/PublicBrandContext';
import { brandPrimary } from '../../lib/apply-brand-theme';
import { brand } from '../../theme/tokens';

export function PostPropertyCta() {
  const publicBrand = usePublicBrand();
  const primary = brandPrimary(publicBrand);

  return (
    <section
      className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      data-testid="post-property-cta"
    >
      <div>
        <h2 className="text-lg font-bold" style={{ color: brand.ink }}>
          Đăng tin miễn phí
        </h2>
        <p className="text-sm mt-1 max-w-md" style={{ color: brand.muted }}>
          Chủ đầu tư và môi giới — đăng bảng hàng GR, duyệt listing và nhận lead từ marketplace.
        </p>
      </div>
      <Link
        to="/auth/login?portal=developer"
        className="shrink-0 rounded-xl px-5 py-3 text-sm font-bold text-white no-underline text-center"
        style={{ background: primary }}
      >
        Đăng nhập CĐT / Agent
      </Link>
    </section>
  );
}

export function PostPropertyLink({ className = '' }: { className?: string }) {
  const publicBrand = usePublicBrand();
  return (
    <Link
      to="/auth/login?portal=developer"
      className={`font-semibold no-underline hover:underline ${className}`}
      style={{ color: brandPrimary(publicBrand) }}
    >
      Đăng tin miễn phí
    </Link>
  );
}
