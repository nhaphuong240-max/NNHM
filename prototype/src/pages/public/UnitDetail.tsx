import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PortalLayout, PageHeader } from '../../components/PortalLayout';
import { VerifiedBadge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PriceDisplay } from '../../components/UnitCard';
import { Card, CardBody } from '../../components/ui/Card';
import { units } from '../../data/mock';
import { formatFullPrice } from '../../lib/utils';
import { CheckCircle2 } from 'lucide-react';

const publicNav = [
  { to: '/public', label: 'Trang chủ', end: true },
  { to: '/public/search', label: 'Tìm kiếm' },
  { to: '/public/compare', label: 'So sánh' },
];

export default function UnitDetail() {
  const { id } = useParams();
  const unit = units.find((u) => u.id === id) ?? units[0];
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', consent: false });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name && form.phone && form.consent) setSubmitted(true);
  };

  return (
    <PortalLayout portal="public" title="Public Portal" nav={publicNav}>
      <PageHeader title={`${unit.code} · ${unit.project}`} backTo="/public/search" />

      <div className="grid lg:grid-cols-3 gap-6 p-4 sm:p-6 pb-20 md:pb-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video bg-gradient-to-br from-secondary to-slate-200 rounded-lg flex items-center justify-center text-6xl">
            🏠
          </div>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-2 w-2 rounded-full ${i === 1 ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>

          <Card>
            <CardBody>
              <h3 className="font-semibold mb-3">Thông số</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted">Diện tích</span><p className="font-medium">{unit.area} m²</p></div>
                <div><span className="text-muted">PN</span><p className="font-medium">{unit.bedrooms}</p></div>
                <div><span className="text-muted">WC</span><p className="font-medium">{unit.bathrooms}</p></div>
                <div><span className="text-muted">Hướng</span><p className="font-medium">{unit.direction}</p></div>
                <div><span className="text-muted">Tầng</span><p className="font-medium">{unit.floor}/35</p></div>
                <div><span className="text-muted">Block</span><p className="font-medium">{unit.block}</p></div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="font-semibold mb-2">Mô tả</h3>
              <p className="text-sm text-slate-600">{unit.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {unit.highlights.map((h) => (
                  <span key={h} className="text-xs bg-secondary px-2 py-1 rounded">{h}</span>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardBody className="space-y-4">
              <VerifiedBadge />
              <PriceDisplay price={unit.price} />
              <p className="text-sm text-muted">{formatFullPrice(unit.price)}</p>
              <StatusBadge status={unit.status} />
              <p className="text-xs text-muted">Cập nhật 2 giờ trước · SSE real-time</p>

              {submitted ? (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="font-medium text-success">Cảm ơn bạn!</p>
                  <p className="text-sm text-muted mt-1">Agent sẽ liên hệ trong 30 phút. AI scoring đang chạy...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 border-t border-border pt-4">
                  <h4 className="font-semibold text-sm">Đăng ký tư vấn</h4>
                  <input
                    required
                    placeholder="Họ tên *"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-border text-sm"
                  />
                  <input
                    required
                    placeholder="SĐT *"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-border text-sm"
                  />
                  <label className="flex items-start gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      required
                      checked={form.consent}
                      onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                      className="mt-0.5"
                    />
                    Tôi đồng ý xử lý dữ liệu theo chính sách PDPA
                  </label>
                  <Button type="submit" className="w-full">Gửi yêu cầu →</Button>
                  <p className="text-xs text-center text-muted">≤3 click từ search (NFR-U03)</p>
                </form>
              )}
            </CardBody>
          </Card>

          <Link to="/public/compare">
            <Button variant="outline" className="w-full">+ Thêm so sánh</Button>
          </Link>
        </div>
      </div>
    </PortalLayout>
  );
}
