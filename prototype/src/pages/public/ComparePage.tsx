import { Link } from 'react-router-dom';
import { PortalLayout, PageHeader } from '../../components/PortalLayout';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { units, formatPrice } from '../../data/mock';

const publicNav = [
  { to: '/public', label: 'Trang chủ', end: true },
  { to: '/public/search', label: 'Tìm kiếm' },
  { to: '/public/compare', label: 'So sánh' },
];

const compareUnits = units.slice(0, 2);

export default function ComparePage() {
  return (
    <PortalLayout portal="public" title="Public Portal" nav={publicNav}>
      <PageHeader title="So sánh căn hộ" description="FR-LS-04 · Tối đa 3 căn" backTo="/public/search" />

      <div className="p-4 sm:p-6 overflow-x-auto pb-20 md:pb-6">
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left p-4 font-medium w-32"></th>
                  {compareUnits.map((u) => (
                    <th key={u.id} className="p-4 text-left font-semibold">
                      {u.code}
                      <p className="text-xs font-normal text-muted">{u.project}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Giá', values: compareUnits.map((u) => formatPrice(u.price)) },
                  { label: 'Diện tích', values: compareUnits.map((u) => `${u.area} m²`) },
                  { label: 'Phòng ngủ', values: compareUnits.map((u) => String(u.bedrooms)) },
                  { label: 'Verified', values: compareUnits.map((u) => (u.verified ? '✓ Có' : '—')) },
                  { label: 'Trạng thái', values: compareUnits.map((u) => (u.status === 'AVAILABLE' ? 'Còn hàng' : u.status)) },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-border">
                    <td className="p-4 font-medium text-muted">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className="p-4">{v}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="p-4"></td>
                  {compareUnits.map((u) => (
                    <td key={u.id} className="p-4">
                      <Link to={`/public/units/${u.id}`}>
                        <Button size="sm" className="w-full">Tư vấn</Button>
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </PortalLayout>
  );
}
