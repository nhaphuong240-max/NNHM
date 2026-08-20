import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, QrCode } from 'lucide-react';
import { PortalLayout, PageHeader } from '../../components/PortalLayout';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { leads, units } from '../../data/mock';

const agentNav = [
  { to: '/agent', label: 'Dashboard', end: true },
  { to: '/agent/leads', label: 'Leads' },
  { to: '/agent/pipeline', label: 'Pipeline' },
  { to: '/agent/listings/new', label: 'Tạo listing' },
  { to: '/agent/bookings/new', label: 'Booking' },
];

export default function BookingCreate() {
  const [created, setCreated] = useState(false);

  return (
    <PortalLayout portal="agent" title="Agent Portal" nav={agentNav} userMenu="Hoàng Nam ▾">
      <PageHeader title="Tạo booking / Giữ chỗ" description="FR-BK-01,02 · Atomic inventory lock" backTo="/agent" />

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {!created ? (
          <Card>
            <CardBody className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted">Lead</label>
                  <select className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-card">
                    {leads.filter((l) => l.tier === 'HOT').map((l) => (
                      <option key={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted">Unit</label>
                  <select className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-card">
                    {units.filter((u) => u.status === 'AVAILABLE').map((u) => (
                      <option key={u.id}>{u.code}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-sm"><StatusBadge status="AVAILABLE" /> Trạng thái GR: AVAILABLE</p>
              <div>
                <label className="text-sm text-muted">Số tiền cọc</label>
                <input defaultValue="50.000.000 VND" className="w-full mt-1 h-10 px-3 rounded-lg border border-border" />
              </div>
              <div>
                <label className="text-sm text-muted">Thời hạn giữ</label>
                <select className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-card">
                  <option>48 giờ</option>
                  <option>24 giờ</option>
                </select>
              </div>
              <textarea
                placeholder="Ghi chú: Khách VIP gallery..."
                className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                rows={2}
              />
              <p className="text-xs text-muted bg-secondary/50 p-3 rounded-lg">
                Atomic lock — căn sẽ chuyển RESERVED khi tạo booking (FR-BK-02, Redis Redlock)
              </p>
              <div className="flex gap-2 justify-end">
                <Link to="/agent"><Button variant="outline">Hủy</Button></Link>
                <Button onClick={() => setCreated(true)}>Tạo booking & sinh link cọc →</Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card className="border-success/30">
            <CardBody className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="font-semibold text-success">Booking #BK-018 created</p>
                <p className="text-sm text-muted mt-1">RESERVED until 30/07 15:00</p>
              </div>
              <div>
                <label className="text-sm text-muted">Link cọc</label>
                <div className="flex gap-2 mt-1">
                  <input
                    readOnly
                    value="https://pay.wereal.vn/pi/abc123"
                    className="flex-1 h-10 px-3 rounded-lg border border-border bg-secondary/30 text-sm font-mono"
                  />
                  <Button variant="outline" size="sm"><Copy className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm"><QrCode className="h-4 w-4" /></Button>
                </div>
              </div>
              <p className="text-sm text-muted">
                State: <span className="font-mono">RESERVED</span> → <span className="font-mono">DEPOSIT_PENDING</span> (chờ khách thanh toán)
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1">Gửi Zalo</Button>
                <Button className="flex-1">Copy link</Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </PortalLayout>
  );
}
