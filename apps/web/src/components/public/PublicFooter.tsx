import { Link } from 'react-router-dom';
import { CITY_GROUPS, DISTRICTS, districtPath, findDistrictBySlug } from '../../lib/districts';
import { brand } from '../../theme/tokens';

export function PublicFooter() {
  return (
    <footer
      className="mt-auto px-4 py-10 border-t"
      style={{ background: brand.primaryDark, color: '#fff', borderColor: 'rgba(255,255,255,0.12)' }}
      data-testid="public-footer"
    >
      <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
        <div>
          <p className="font-extrabold text-base mb-3">Ngôi Nhà Hôm Nay</p>
          <p className="opacity-80 leading-relaxed">
            Marketplace bất động sản — tìm nhà, so sánh căn, giữ chỗ và cọc minh bạch.
          </p>
        </div>

        {CITY_GROUPS.map((group) => (
          <div key={group.city}>
            <p className="font-bold mb-2">{group.city}</p>
            <ul className="space-y-1.5">
              {group.slugs.map((slug) => {
                const d = findDistrictBySlug(slug);
                if (!d) return null;
                return (
                  <li key={slug}>
                    <Link
                      to={districtPath(slug)}
                      className="opacity-85 hover:opacity-100 no-underline hover:underline"
                      style={{ color: '#fff' }}
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
          <p className="font-bold mb-2">Công cụ</p>
          <ul className="space-y-1.5">
            <li>
              <Link to="/public/tools/emi" className="opacity-85 hover:opacity-100 no-underline hover:underline" style={{ color: '#fff' }}>
                Tính trả góp (EMI)
              </Link>
            </li>
            <li>
              <Link to="/public/search" className="opacity-85 hover:opacity-100 no-underline hover:underline" style={{ color: '#fff' }}>
                Tìm kiếm nâng cao
              </Link>
            </li>
            <li>
              <Link to="/public/map" className="opacity-85 hover:opacity-100 no-underline hover:underline" style={{ color: '#fff' }}>
                Bản đồ listing
              </Link>
            </li>
          </ul>
          <p className="font-bold mt-4 mb-2">Tất cả quận</p>
          <p className="opacity-75 text-xs leading-relaxed">
            {DISTRICTS.map((d) => d.label).join(' · ')}
          </p>
        </div>
      </div>
      <p className="max-w-6xl mx-auto mt-8 pt-6 text-xs opacity-60 border-t" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        © {new Date().getFullYear()} Ngôi Nhà Hôm Nay · Dữ liệu listing từ search-index tenant pilot
      </p>
    </footer>
  );
}
