import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import { PortalLayout } from '../../components/PortalLayout';
import { UnitCard } from '../../components/UnitCard';
import { Button } from '../../components/ui/Button';
import { projects, units } from '../../data/mock';

const publicNav = [
  { to: '/public', label: 'Trang chủ', end: true },
  { to: '/public/search', label: 'Tìm kiếm' },
  { to: '/public/compare', label: 'So sánh' },
];

export default function PublicHome() {
  const [query, setQuery] = useState('Vinhomes Q9 3PN');
  const navigate = useNavigate();

  return (
    <PortalLayout portal="public" title="Public Portal" nav={publicNav}>
      <div className="bg-gradient-to-b from-secondary to-background pb-8">
        <div className="max-w-4xl mx-auto px-4 pt-10 text-center">
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">
            Tìm căn hộ mơ ước — dữ liệu chuẩn từ chủ đầu tư
          </h1>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-lg border border-border bg-card shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Nhập tên dự án, quận, đường..."
              />
            </div>
            <Button size="lg" onClick={() => navigate('/public/search')}>
              Tìm kiếm
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4 text-sm">
            <span className="bg-card border border-border rounded-full px-3 py-1">TP.HCM</span>
            <span className="bg-card border border-border rounded-full px-3 py-1">2-3 PN</span>
            <span className="bg-card border border-border rounded-full px-3 py-1">Giá: Tất cả</span>
            <span className="bg-card border border-border rounded-full px-3 py-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Bản đồ
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10 pb-20 md:pb-8">
        <section>
          <h2 className="text-lg font-semibold mb-4">Dự án nổi bật</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {projects.map((p) => (
              <Link
                key={p.name}
                to="/public/search"
                className="rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow"
              >
                <div className="aspect-video bg-secondary rounded mb-3 flex items-center justify-center text-primary/40 text-4xl">
                  🏢
                </div>
                <h3 className="font-medium text-sm">{p.name}</h3>
                <p className="text-xs text-muted">{p.district} · {p.units} căn</p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Căn hộ Verified mới nhất</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.slice(0, 3).map((u) => (
              <UnitCard key={u.id} unit={u} linkTo={`/public/units/${u.id}`} />
            ))}
          </div>
        </section>
      </div>
    </PortalLayout>
  );
}
