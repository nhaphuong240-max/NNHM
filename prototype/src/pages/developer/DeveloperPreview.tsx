import { Link } from 'react-router-dom';
import { PortalLayout, PageHeader } from '../../components/PortalLayout';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { units, formatPrice } from '../../data/mock';

export default function DeveloperPreview() {
  return (
    <PortalLayout portal="admin" title="Developer Portal" subtitle="Phase 2 outline · FR-UX-04" nav={[]} userMenu="Minh Tuấn ▾">
      <PageHeader
        title="Developer Portal — Vinhomes Pilot"
        description="Phase 2 outline · Persona P1 Minh Tuấn"
        backTo="/"
        actions={
          <>
            <Button variant="outline" size="sm">Import bảng hàng</Button>
            <Button variant="outline" size="sm">Export Excel</Button>
          </>
        }
      />

      <div className="p-4 sm:p-6 space-y-4">
        <div className="rounded-lg bg-accent/10 border border-accent/30 p-4 text-sm">
          <strong>Preview only</strong> — Developer Portal đầy đủ sẽ triển khai Phase 2 (FR-UX-04, FR-GR-07 bulk import).
        </div>

        <div className="flex gap-2 flex-wrap">
          <select className="h-9 px-3 rounded-lg border border-border bg-card text-sm"><option>Vinhomes Q9</option></select>
          <select className="h-9 px-3 rounded-lg border border-border bg-card text-sm"><option>Block</option></select>
          <select className="h-9 px-3 rounded-lg border border-border bg-card text-sm"><option>Status</option></select>
          <input placeholder="Search..." className="h-9 px-3 rounded-lg border border-border text-sm" />
        </div>

        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left p-3 font-medium">Code</th>
                  <th className="text-left p-3 font-medium">Floor</th>
                  <th className="text-left p-3 font-medium">Area</th>
                  <th className="text-left p-3 font-medium">Price (GR)</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Version</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-secondary/20">
                    <td className="p-3 font-mono">{u.code}</td>
                    <td className="p-3">{u.floor}</td>
                    <td className="p-3">{u.area}m²</td>
                    <td className="p-3 font-medium">{formatPrice(u.price)}</td>
                    <td className="p-3"><StatusBadge status={u.status} /></td>
                    <td className="p-3 font-mono text-muted">v{u.id === 'un_01' ? 4 : 3}</td>
                    <td className="p-3"><Button variant="ghost" size="sm">{u.status === 'RESERVED' ? 'History' : 'Edit'}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold text-sm mb-2">Import Wizard (P2)</h3>
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span> Upload
              <span>→</span>
              <span className="bg-secondary rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span> Validate
              <span>→</span>
              <span className="bg-secondary rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span> Preview diff
              <span>→</span>
              <span className="bg-secondary rounded-full w-6 h-6 flex items-center justify-center text-xs">4</span> Commit
            </div>
          </CardBody>
        </Card>

        <Link to="/" className="text-sm text-primary hover:underline">← Về Portal Hub</Link>
      </div>
    </PortalLayout>
  );
}
