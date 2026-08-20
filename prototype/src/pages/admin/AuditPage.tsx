import { PortalLayout, PageHeader } from '../../components/PortalLayout';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { auditLogs } from '../../data/mock';

const adminNav = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/tenants', label: 'Tenants' },
  { to: '/admin/moderation', label: 'Moderation' },
  { to: '/admin/audit', label: 'Audit log' },
];

export default function AuditPage() {
  return (
    <PortalLayout portal="admin" title="Admin Portal" nav={adminNav} userMenu="Quốc Bảo ▾">
      <PageHeader title="Audit Log Viewer" description="FR-TR-01 · Retention ≥5 năm" />

      <div className="p-4 sm:p-6">
        <div className="flex gap-2 mb-4 flex-wrap">
          <select className="h-9 px-3 rounded-lg border border-border text-sm bg-card"><option>Unit</option><option>Listing</option><option>Booking</option></select>
          <select className="h-9 px-3 rounded-lg border border-border text-sm bg-card"><option>7 ngày</option><option>30 ngày</option></select>
          <Button variant="outline" size="sm">Export</Button>
        </div>

        <Card>
          <CardBody className="p-0 divide-y divide-border">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-secondary/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-medium">{log.event}</p>
                  <p className="text-sm text-muted">{log.entity} · {log.actor} · {log.detail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{log.time}</span>
                  <Button variant="ghost" size="sm">Xem chi tiết</Button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </PortalLayout>
  );
}
