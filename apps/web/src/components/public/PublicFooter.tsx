import { Link } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import { PostPropertyLink } from './PostPropertyCta';
import { CITY_GROUPS, DISTRICTS, districtPath, findDistrictBySlug } from '../../lib/districts';
import { brand } from '../../theme/tokens';

export function PublicFooter() {
  return (
    <footer
      className="mt-auto px-4 py-12"
      style={{ background: brand.primaryDark, color: '#F4EFE6' }}
      data-testid="public-footer"
    >
      <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-10 text-sm">
        <div>
          <p className="nnhn-display text-xl mb-3 flex items-center gap-2">
            <BrandMark size={22} />
            Ngôi Nhà Hôm Nay
          </p>
          <p className="opacity-80 leading-relaxed">
            Marketplace bất động sản — tìm nhà, so sánh căn, giữ chỗ và cọc minh bạch.
          </p>
        </div>

        {CITY_GROUPS.map((group) => (
          <div key={group.city}>
            <p className="nnhn-kicker mb-3" style={{ color: '#E8C4A8' }}>
              {group.city}
            </p>
            <ul className="space-y-1.5">
              {group.slugs.map((slug) => {
                const d = findDistrictBySlug(slug);
                if (!d) return null;
                return (
                  <li key={slug}>
                    <Link
                      to={districtPath(slug)}
                      className="opacity-85 hover:opacity-100 no-underline hover:underline"
                      style={{ color: '#F4EFE6' }}
                    >
                      Căn hộ {d.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div>
          <p className="nnhn-kicker mb-3" style={{ color: '#E8C4A8' }}>
            Đối tác
          </p>
          <ul className="space-y-1.5">
            <li>
              <PostPropertyLink inheritColor className="opacity-85 hover:opacity-100" />
            </li>
            <li>
              <Link
                to="/app"
                className="opacity-85 hover:opacity-100 no-underline hover:underline"
                style={{ color: '#F4EFE6' }}
              >
                Cổng vận hành (đăng nhập)
              </Link>
            </li>
          </ul>
          <p className="nnhn-kicker mt-6 mb-3" style={{ color: '#E8C4A8' }}>
            Công cụ
          </p>
          <ul className="space-y-1.5">
            <li>
              <Link
                to="/public/tools/emi"
                className="opacity-85 hover:opacity-100 no-underline hover:underline"
                style={{ color: '#F4EFE6' }}
              >
                Tính trả góp (EMI)
              </Link>
            </li>
            <li>
              <Link
                to="/public/search"
                className="opacity-85 hover:opacity-100 no-underline hover:underline"
                style={{ color: '#F4EFE6' }}
              >
                Tìm kiếm nâng cao
              </Link>
            </li>
            <li>
              <Link
                to="/public/map"
                className="opacity-85 hover:opacity-100 no-underline hover:underline"
                style={{ color: '#F4EFE6' }}
              >
                Bản đồ listing
              </Link>
            </li>
          </ul>
          <p className="opacity-60 text-xs leading-relaxed mt-4">
            {DISTRICTS.map((d) => d.label).join(' · ')}
          </p>
        </div>
      </div>
      <p
        className="max-w-6xl mx-auto mt-10 pt-6 text-xs opacity-50 border-t"
        style={{ borderColor: 'rgba(244, 239, 230, 0.16)' }}
      >
        © {new Date().getFullYear()} Ngôi Nhà Hôm Nay · Dữ liệu listing từ search-index tenant pilot
      </p>
    </footer>
  );
}
