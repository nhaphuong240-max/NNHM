import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout, PageHeader } from '../../components/PortalLayout';
import { Button } from '../../components/ui/Button';
import { units } from '../../data/mock';

const publicNav = [
  { to: '/public', label: 'Trang chủ', end: true },
  { to: '/public/search', label: 'Tìm kiếm' },
  { to: '/public/compare', label: 'So sánh' },
];

export default function SearchResults() {
  const [compare, setCompare] = useState<string[]>([]);

  const toggleCompare = (id: string) => {
    setCompare((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev,
    );
  };

  return (
    <PortalLayout portal="public" title="Public Portal" nav={publicNav}>
      <PageHeader
        title="Kết quả: Vinhomes Q9 3PN"
        description="45 căn · Verified Listing"
        backTo="/public"
        actions={
          compare.length > 0 ? (
            <Link to="/public/compare">
              <Button variant="secondary">So sánh ({compare.length}/3)</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 pb-20 md:pb-6">
        <aside className="lg:w-64 shrink-0">
          <div className="rounded-lg border border-border bg-card p-4 space-y-4 sticky top-4">
            <h3 className="font-semibold text-sm">Bộ lọc</h3>
            <div>
              <p className="text-xs font-medium text-muted mb-2">Khu vực</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked /> Q9
              </label>
              <label className="flex items-center gap-2 text-sm mt-1">
                <input type="checkbox" /> Q2
              </label>
            </div>
            <div>
              <p className="text-xs font-medium text-muted mb-2">Giá</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="price" /> &lt; 3 tỷ
              </label>
              <label className="flex items-center gap-2 text-sm mt-1">
                <input type="radio" name="price" defaultChecked /> 3–4 tỷ
              </label>
              <label className="flex items-center gap-2 text-sm mt-1">
                <input type="radio" name="price" /> &gt; 4 tỷ
              </label>
            </div>
            <div>
              <p className="text-xs font-medium text-muted mb-2">Phòng ngủ</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked /> 3 PN
              </label>
            </div>
          </div>
        </aside>

        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Sắp xếp: Giá thấp → cao</span>
            <span className="text-muted">Đã chọn so sánh: {compare.length}/3</span>
          </div>
          <div className="grid gap-4">
            {units.filter((u) => u.bedrooms === 3).map((u) => (
              <div key={u.id} className="grid sm:grid-cols-[200px_1fr] gap-4 rounded-lg border border-border bg-card p-4 hover:shadow-sm">
                <Link to={`/public/units/${u.id}`} className="block">
                  <div className="aspect-video bg-secondary rounded flex items-center justify-center text-4xl">🏠</div>
                </Link>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <Link to={`/public/units/${u.id}`} className="hover:text-primary">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{u.code}</h3>
                      {u.verified && <span className="text-xs bg-green-100 text-success px-2 py-0.5 rounded">Verified</span>}
                    </div>
                    <p className="text-sm text-muted">{u.block} · Tầng {u.floor} · {u.bedrooms}PN · {u.area}m²</p>
                    <p className="text-xl font-bold text-primary mt-1">{(u.price / 1e9).toFixed(1)} tỷ</p>
                    <p className="text-xs text-success mt-1">Còn hàng</p>
                  </Link>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleCompare(u.id)}>
                      {compare.includes(u.id) ? '✓ So sánh' : '+ So sánh'}
                    </Button>
                    <Link to={`/public/units/${u.id}`}>
                      <Button size="sm">Xem chi tiết</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
