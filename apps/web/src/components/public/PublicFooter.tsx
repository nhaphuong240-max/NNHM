import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import { PostPropertyLink } from './PostPropertyCta';
import { districtPath } from '../../lib/districts';
import { useGeoAreas } from '../../hooks/useGeoAreas';
import { brand } from '../../theme/tokens';

export function PublicFooter() {
  const { areas } = useGeoAreas();

  const cityGroups = useMemo(() => {
    const map = new Map<string, typeof areas>();
    for (const area of areas) {
      const list = map.get(area.city) ?? [];
      list.push(area);
      map.set(area.city, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'vi'));
  }, [areas]);

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

        {cityGroups.map(([city, cityAreas]) => (
          <div key={city}>
            <p className="nnhn-kicker mb-3" style={{ color: '#E8C4A8' }}>
              {city}
            </p>
            <ul className="space-y-1.5">
              {cityAreas.map((d) => (
                <li key={d.slug}>
                  <Link
                    to={districtPath(d.slug)}
                    className="opacity-85 hover:opacity-100 no-underline hover:underline"
                    style={{ color: '#F4EFE6' }}
                  >
                    Căn hộ {d.label}
                  </Link>
                </li>
              ))}
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
                to="/legal/privacy"
                className="opacity-85 hover:opacity-100 no-underline hover:underline"
                style={{ color: '#F4EFE6' }}
              >
                Chính sách bảo mật
              </Link>
            </li>
            <li>
              <Link
                to="/public/saved"
                className="opacity-85 hover:opacity-100 no-underline hover:underline"
                style={{ color: '#F4EFE6' }}
              >
                Đã lưu / cảnh báo
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
            {areas.map((d) => d.label).join(' · ')}
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
