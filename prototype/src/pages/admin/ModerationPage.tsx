import { PortalLayout, PageHeader } from '../../components/PortalLayout';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { listings } from '../../data/mock';

const adminNav = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/tenants', label: 'Tenants' },
  { to: '/admin/moderation', label: 'Moderation' },
  { to: '/admin/audit', label: 'Audit log' },
];

export default function ModerationPage() {
  return (
    <PortalLayout portal="admin" title="Admin Portal" nav={adminNav} userMenu="Quốc Bảo ▾">
      <PageHeader title="Duyệt listing" description={`${listings.filter((l) => l.status === 'PENDING_REVIEW').length} pending · FR-LS-01`} />

      <div className="p-4 sm:p-6 space-y-4">
        {listings.filter((l) => l.status === 'PENDING_REVIEW').map((l) => (
          <Card key={l.id} className={l.antiDrift === 'FLAG' ? 'border-warning/50' : ''}>
            <CardBody>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{l.id} · {l.unitCode}</h3>
                    <StatusBadge status={l.antiDrift} />
                    {l.verified && <StatusBadge status="PUBLISHED" />}
                  </div>
                  <p className="text-sm text-muted mt-1">{l.title}</p>
                  <p className="text-sm text-muted">Agent: {l.agent}</p>
                  {l.antiDrift === 'FLAG' && (
                    <div className="mt-3 rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-warning">
                      Giá listing lệch GR 5% — anti-drift blocked (FR-GR-04)
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm">Preview</Button>
                  {l.antiDrift === 'PASS' ? (
                    <>
                      <Button size="sm" variant="primary">Duyệt</Button>
                      <Button size="sm" variant="destructive">Từ chối</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline">Xem drift</Button>
                      <Button size="sm" variant="destructive">Reject</Button>
                    </>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </PortalLayout>
  );
}
