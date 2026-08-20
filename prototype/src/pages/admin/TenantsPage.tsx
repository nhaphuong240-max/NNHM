import { PortalLayout, PageHeader } from '../../components/PortalLayout';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { tenants } from '../../data/mock';

const adminNav = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/tenants', label: 'Tenants' },
  { to: '/admin/moderation', label: 'Moderation' },
  { to: '/admin/audit', label: 'Audit log' },
];

export default function TenantsPage() {
  return (
    <PortalLayout portal="admin" title="Admin Portal" nav={adminNav} userMenu="Quốc Bảo ▾">
      <PageHeader
        title="Tenant Management"
        description="Developer & Agency tenants"
        actions={<Button size="sm">+ Onboard tenant</Button>}
      />

      <div className="p-4 sm:p-6">
        <div className="flex gap-2 mb-4">
          <select className="h-9 px-3 rounded-lg border border-border text-sm bg-card"><option>Developer</option><option>Agency</option></select>
          <select className="h-9 px-3 rounded-lg border border-border text-sm bg-card"><option>Active</option></select>
        </div>

        <Card>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left p-4 font-medium">Tenant</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Users</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b border-border hover:bg-secondary/20">
                    <td className="p-4 font-medium">{t.name}</td>
                    <td className="p-4 text-muted">{t.type}</td>
                    <td className="p-4"><StatusBadge status={t.status} /></td>
                    <td className="p-4">{t.users}</td>
                    <td className="p-4"><Button variant="ghost" size="sm">⋯</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </PortalLayout>
  );
}
