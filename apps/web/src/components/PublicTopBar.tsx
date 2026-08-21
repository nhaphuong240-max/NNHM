import { Link } from 'react-router-dom';
import { usePublicBrand } from '../context/PublicBrandContext';
import { brandPrimaryDark } from '../lib/apply-brand-theme';

export function PublicTopBar() {
  const publicBrand = usePublicBrand();
  const primaryDark = brandPrimaryDark(publicBrand);
  const label = publicBrand?.displayName ?? 'Ngôi Nhà Hôm Nay';

  return (
    <header
      className="px-4 py-3"
      style={{ background: primaryDark, color: '#fff' }}
      data-testid="public-topbar"
    >
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="no-underline text-white font-extrabold tracking-tight flex items-center gap-2">
          {publicBrand?.logoUrl ? (
            <img src={publicBrand.logoUrl} alt="" className="h-7 w-auto" />
          ) : null}
          {label}
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link to="/public/search" className="rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.12)' }}>
            Tìm nhà
          </Link>
          <Link to="/public/map" className="rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.12)' }}>
            Bản đồ
          </Link>
          <Link to="/public/tools/emi" className="rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.12)' }}>
            Trả góp
          </Link>
          <Link to="/auth/login" className="rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.12)' }}>
            Đăng nhập
          </Link>
          <Link
            to="/app"
            className="rounded-full px-3 py-1.5 font-semibold"
            style={{ background: publicBrand?.accentColor ?? '#C7D9C9', color: primaryDark }}
          >
            Đối tác
          </Link>
        </nav>
      </div>
    </header>
  );
}
