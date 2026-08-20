import { Link } from 'react-router-dom';
import { PortalLayout, PageHeader, KPICard } from '../../components/PortalLayout';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { listings } from '../../data/mock';

const adminNav = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/tenants', label: 'Tenants' },
  { to: '/admin/moderation', label: 'Moderation' },
  { to: '/admin/audit', label: 'Audit log' },
];

export default function AdminDashboard() {
  return (
    <PortalLayout portal="admin" title="Admin Portal" subtitle="Platform Ops" nav={adminNav} userMenu="Quốc Bảo ▾">
      <PageHeader title="Dashboard KPI Platform" description="FR-AN-01" />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Leads (30d)" value={120} />
          <KPICard label="Bookings" value={18} />
          <KPICard label="Cọc" value={12} />
          <KPICard label="Pending review" value={listings.filter((l) => l.status === 'PENDING_REVIEW').length} highlight />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Moderation queue</h3>
                <Link to="/admin/moderation"><Button size="sm" variant="outline">Xem tất cả</Button></Link>
              </div>
              <div className="space-y-3">
                {listings.filter((l) => l.status === 'PENDING_REVIEW').slice(0, 2).map((l) => (
                  <div key={l.id} className="flex justify-between items-center text-sm border-b border-border pb-2">
                    <div>
                      <p className="font-medium">{l.id} · {l.unitCode}</p>
                      <p className="text-muted">{l.agent}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${l.antiDrift === 'PASS' ? 'bg-green-100 text-success' : 'bg-orange-100 text-warning'}`}>
                      {l.antiDrift}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Tenant activity</h3>
                <Link to="/admin/tenants"><Button size="sm" variant="outline">Quản lý</Button></Link>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Dev Pilot Vinhomes</span><span className="text-success">ACTIVE</span></div>
                <div className="flex justify-between"><span>Agency ABC</span><span className="text-success">ACTIVE</span></div>
                <div className="flex justify-between"><span>Agency XYZ</span><span className="text-warning">PENDING</span></div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </PortalLayout>
  );
}
