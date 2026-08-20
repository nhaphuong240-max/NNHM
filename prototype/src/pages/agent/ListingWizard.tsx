import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { PortalLayout, PageHeader } from '../../components/PortalLayout';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { PriceDisplay } from '../../components/UnitCard';
import { units } from '../../data/mock';

const agentNav = [
  { to: '/agent', label: 'Dashboard', end: true },
  { to: '/agent/leads', label: 'Leads' },
  { to: '/agent/pipeline', label: 'Pipeline' },
  { to: '/agent/listings/new', label: 'Tạo listing' },
  { to: '/agent/bookings/new', label: 'Booking' },
];

const aiPreview =
  'Căn hộ cao cấp tầng 12 Block A, view sông thoáng mát. 3 phòng ngủ rộng rãi, nội thất cao cấp, gần metro Bến Thành — Suối Tiên. Phù hợp gia đình trẻ, đầu tư cho thuê.';

export default function ListingWizard() {
  const unit = units[0];
  const [title, setTitle] = useState('Căn 3PN view sông Block A');
  const [description, setDescription] = useState('');
  const [aiApproved, setAiApproved] = useState(false);
  const [generated, setGenerated] = useState(false);

  return (
    <PortalLayout portal="agent" title="Agent Portal" nav={agentNav} userMenu="Hoàng Nam ▾">
      <PageHeader title="Tạo listing mới" description="Bước 2/3: Nội dung · NFR-U02 ≤5 phút" backTo="/agent" />

      <div className="grid lg:grid-cols-3 gap-6 p-4 sm:p-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardBody className="space-y-4">
              <div>
                <label className="text-sm text-muted">Chọn unit</label>
                <p className="font-medium">{unit.code} · {unit.project}</p>
              </div>
              <div>
                <label className="text-sm text-muted">Giá gốc GR (read-only)</label>
                <PriceDisplay price={unit.price} locked />
              </div>
              <StatusBadge status="PASS" />

              <div>
                <label className="text-sm font-medium">Tiêu đề *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-lg border border-border"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mô tả *</label>
                <textarea
                  value={description || (generated ? aiPreview : '')}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm"
                  placeholder="Agent edit / paste from copilot..."
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={aiApproved} onChange={(e) => setAiApproved(e.target.checked)} />
                  Human approve: Đã duyệt nội dung AI (FR-AI-04)
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline">Lưu nháp</Button>
                <Button disabled={!aiApproved && generated}>Gửi duyệt →</Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card className="h-fit">
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <h3 className="font-semibold">AI Copilot</h3>
            </div>
            <select className="w-full h-9 px-3 rounded-lg border border-border text-sm bg-card">
              <option>Premium</option>
              <option>Standard</option>
            </select>
            <Button variant="secondary" className="w-full" onClick={() => setGenerated(true)}>
              Tạo mô tả AI
            </Button>
            {generated && (
              <>
                <div className="rounded-lg bg-secondary/50 p-3 text-sm border border-border">
                  <p className="text-xs text-muted mb-2">Preview AI</p>
                  {aiPreview}
                </div>
                <div className="rounded-lg bg-orange-50 border border-orange-200 p-2 text-xs text-warning">
                  Disclaimer: Nội dung AI — cần agent duyệt trước publish (NFR-C04)
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => { setDescription(aiPreview); setGenerated(true); }}>
                    Dùng bản này
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">Tạo lại</Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </PortalLayout>
  );
}
