import { Link } from 'react-router-dom';
import { BrandMark } from './public/BrandMark';
import { usePublicBrand } from '../context/PublicBrandContext';
import { brand } from '../theme/tokens';

export function PublicTopBar() {
  const publicBrand = usePublicBrand();
  const label = publicBrand?.displayName ?? 'Ngôi Nhà Hôm Nay';

  return (
    <header
      className="sticky top-0 z-40 px-4 py-3 border-b backdrop-blur-md"
      style={{
        background: 'rgba(255, 252, 247, 0.88)',
        borderColor: brand.border,
        color: brand.ink,
      }}
      data-testid="public-topbar"
    >
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="no-underline font-extrabold tracking-tight flex items-center gap-2.5"
          style={{ color: brand.primaryDark }}
        >
          {publicBrand?.logoUrl ? (
            <img src={publicBrand.logoUrl} alt="" className="h-7 w-auto" />
          ) : (
            <span className="inline-flex" style={{ color: brand.primary }}>
              <BrandMark size={26} />
            </span>
          )}
          <span className="nnhn-display text-[1.05rem] sm:text-lg">{label}</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <Link to="/public/search?intent=buy" className="rounded-full px-3 py-1.5 hover:bg-black/5">
            Mua
          </Link>
          <Link to="/public/search?intent=rent" className="rounded-full px-3 py-1.5 hover:bg-black/5">
            Thuê
          </Link>
          <Link to="/public/search?intent=project" className="rounded-full px-3 py-1.5 hover:bg-black/5">
            Dự án
          </Link>
          <Link to="/public/saved" className="rounded-full px-3 py-1.5 hover:bg-black/5">
            Đã lưu
          </Link>
          <Link to="/public/map" className="rounded-full px-3 py-1.5 hover:bg-black/5">
            Bản đồ
          </Link>
          <Link to="/public/chat" className="rounded-full px-3 py-1.5 hover:bg-black/5">
            Tư vấn AI
          </Link>
          <Link to="/buyer/deals" className="rounded-full px-3 py-1.5 hover:bg-black/5">
            Giao dịch
          </Link>
          <Link to="/public/tools/emi" className="rounded-full px-3 py-1.5 hover:bg-black/5">
            Trả góp
          </Link>
          <Link to="/auth/login" className="rounded-full px-3 py-1.5 hover:bg-black/5">
            Đăng nhập
          </Link>
          <Link
            to="/app"
            className="rounded-full px-3.5 py-1.5 font-semibold no-underline ml-1"
            style={{ background: brand.primary, color: '#fff' }}
          >
            Đối tác
          </Link>
        </nav>
      </div>
    </header>
  );
}
