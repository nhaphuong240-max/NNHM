import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Upload,
  GitBranch,
  CreditCard,
  FileText,
  Zap,
  Globe,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import type { UseCase } from '../../config/useCases';
import { units, leads, listings, auditLogs, pipelineStages, formatPrice, formatFullPrice } from '../../data/mock';
import { FlowSteps, MockChart, StatCard } from './PremiumUI';
import { AIBanner } from './PremiumShell';
import { VerifiedBadge, HotLeadBadge, StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';

export function ScreenTemplate({ uc }: { uc: UseCase }) {
  switch (uc.screenType) {
    case 'search':
      return <SearchTemplate uc={uc} />;
    case 'detail':
      return <DetailTemplate uc={uc} />;
    case 'compare':
      return <CompareTemplate />;
    case 'dashboard':
    case 'analytics':
      return <AnalyticsTemplate uc={uc} />;
    case 'kanban':
      return <KanbanTemplate />;
    case 'wizard':
    case 'import':
      return <WizardTemplate uc={uc} />;
    case 'moderation':
      return <ModerationTemplate uc={uc} />;
    case 'audit':
      return <AuditTemplate uc={uc} />;
    case 'booking':
      return <BookingTemplate uc={uc} />;
    case 'payment':
      return <PaymentTemplate uc={uc} />;
    case 'finance':
    case 'commission':
      return <FinanceTemplate uc={uc} />;
    case 'lead':
      return <LeadTemplate />;
    case 'listing':
    case 'ai':
      return <ListingAITemplate uc={uc} />;
    case 'golden-record':
      return <GoldenRecordTemplate />;
    case 'product-graph':
      return <ProductGraphTemplate />;
    case 'time-travel':
      return <TimeTravelTemplate />;
    case 'users':
    case 'routing':
      return <UsersTemplate uc={uc} />;
    case 'login':
      return null; // handled by LoginPage
    case 'integration':
      return <IntegrationTemplate uc={uc} />;
    case 'dispute':
      return <DisputeTemplate />;
    case 'documents':
      return <DocumentsTemplate />;
    case 'contract':
      return <ContractTemplate uc={uc} />;
    case 'workflow':
    case 'whitelabel':
      return <ConfigTemplate uc={uc} />;
    case 'marketing':
      return <MarketingTemplate uc={uc} />;
    case 'mobile':
      return <MobileTemplate />;
    case 'buyer-track':
      return <BuyerTrackTemplate />;
    case 'inbox':
      return <InboxTemplate />;
    case 'map3d':
      return <Map3DTemplate />;
    case 'system':
      return <SystemTemplate uc={uc} />;
    case 'pipeline':
      return <KanbanTemplate />;
    default:
      return <GenericTemplate uc={uc} />;
  }
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass-card rounded-2xl p-6 ${className}`}>{children}</div>;
}

function GenericTemplate({ uc }: { uc: UseCase }) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Panel className="lg:col-span-2">
        <h3 className="font-semibold text-lg mb-4">Màn hình mô phỏng — {uc.title}</h3>
        <MockChart label={uc.module} />
        <p className="text-sm text-slate-500 mt-4">Prototype screen cho {uc.id}. Triển khai production theo OpenAPI contract.</p>
      </Panel>
      <Panel>
        <h4 className="font-semibold text-sm text-slate-600 mb-3">Luồng nghiệp vụ</h4>
        <FlowSteps steps={uc.flow} />
      </Panel>
    </div>
  );
}

function SearchTemplate({ uc }: { uc: UseCase }) {
  return (
    <div className="space-y-6">
      <div className="premium-gradient rounded-2xl p-8 text-white">
        <h2 className="text-2xl font-bold">Tìm căn hộ chuẩn Golden Record</h2>
        <p className="text-white/70 mt-2 text-sm">OpenSearch · Facet · Geo · Verified Listing</p>
        <div className="mt-6 flex gap-2">
          <input className="flex-1 h-12 rounded-xl px-4 text-slate-900" placeholder="Vinhomes Q9, 3 phòng ngủ..." defaultValue="Vinhomes Q9 3PN" />
          <Button className="bg-[#C9A227] hover:bg-[#a8861f] text-white h-12 px-8">Tìm kiếm</Button>
        </div>
      </div>
      <div className="grid lg:grid-cols-4 gap-6">
        <Panel className="lg:col-span-1 space-y-4">
          <h4 className="font-semibold text-sm">Bộ lọc</h4>
          {['Q9', 'Q2', 'Q7'].map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked={d === 'Q9'} /> {d}</label>
          ))}
          <hr className="border-slate-100" />
          <p className="text-xs font-semibold text-slate-400 uppercase">Giá</p>
          {['< 3 tỷ', '3–4 tỷ', '> 4 tỷ'].map((p, i) => (
            <label key={p} className="flex items-center gap-2 text-sm"><input type="radio" name="p" defaultChecked={i === 1} /> {p}</label>
          ))}
        </Panel>
        <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
          {units.map((u) => (
            <Link key={u.id} to={`/uc/UC-LS-05?unit=${u.id}`} className="glass-card rounded-2xl overflow-hidden group">
              <div className="aspect-[16/10] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative">
                <Building2 className="h-12 w-12 text-[#0F4C81]/20" />
                {u.verified && <div className="absolute top-3 right-3"><VerifiedBadge /></div>}
              </div>
              <div className="p-4">
                <p className="font-bold text-lg">{u.code}</p>
                <p className="text-sm text-slate-500">{u.block} · {u.bedrooms}PN · {u.area}m²</p>
                <p className="text-xl font-bold text-[#0F4C81] mt-2 tabular-nums">{formatPrice(u.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      {uc.id === 'UC-AI-06' && <AIBanner />}
    </div>
  );
}

function DetailTemplate({ uc }: { uc: UseCase }) {
  const unit = units[0];
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="aspect-video rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
          <Building2 className="h-20 w-20 text-[#0F4C81]/30" />
        </div>
        <Panel>
          <h3 className="font-semibold mb-4">Thông số kỹ thuật</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[['Diện tích', `${unit.area} m²`], ['PN', unit.bedrooms], ['Hướng', unit.direction], ['Tầng', `${unit.floor}/35`], ['Block', unit.block], ['Status', 'AVAILABLE']].map(([k, v]) => (
              <div key={k}><p className="text-slate-400 text-xs">{k}</p><p className="font-semibold">{v}</p></div>
            ))}
          </div>
        </Panel>
        {uc.id === 'UC-GR-07' && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
            <Zap className="h-4 w-4" /> SSE live · Cập nhật real-time · lag ≤5s
          </div>
        )}
      </div>
      <Panel className="h-fit sticky top-4 space-y-4">
        <VerifiedBadge />
        <p className="text-3xl font-bold text-[#0F4C81] tabular-nums">{formatFullPrice(unit.price)}</p>
        <StatusBadge status="AVAILABLE" />
        <form className="space-y-3 pt-4 border-t">
          <h4 className="font-semibold">Đăng ký tư vấn</h4>
          <input className="w-full h-11 rounded-xl border px-3 text-sm" placeholder="Họ tên *" />
          <input className="w-full h-11 rounded-xl border px-3 text-sm" placeholder="SĐT *" />
          <label className="flex gap-2 text-xs text-slate-500"><input type="checkbox" /> Đồng ý PDPA</label>
          <Button className="w-full">Gửi yêu cầu</Button>
        </form>
      </Panel>
    </div>
  );
}

function CompareTemplate() {
  const compare = units.slice(0, 3);
  return (
    <Panel className="overflow-x-auto">
      <table className="data-table min-w-[700px]">
        <thead><tr><th></th>{compare.map((u) => <th key={u.id}>{u.code}</th>)}</tr></thead>
        <tbody>
          {[['Giá', compare.map((u) => formatPrice(u.price))], ['Diện tích', compare.map((u) => `${u.area}m²`)], ['PN', compare.map((u) => String(u.bedrooms))], ['Verified', compare.map((u) => (u.verified ? '✓' : '—'))]].map(([label, vals]) => (
            <tr key={String(label)}><td className="font-medium text-slate-500">{label}</td>{(vals as string[]).map((v, i) => <td key={i}>{v}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function AnalyticsTemplate({ uc }: { uc: UseCase }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Leads" value={120} trend="+12% vs last month" />
        <StatCard label="Hot Leads" value={25} highlight trend="Score ≥80" />
        <StatCard label="Bookings" value={18} trend="+3 tuần này" />
        <StatCard label="GMV Cọc" value="600M" trend="Phase 2 full GMV" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel><MockChart label={uc.id.includes('AN') ? 'Funnel conversion' : 'KPI trend'} /></Panel>
        <Panel>
          <h4 className="font-semibold mb-4">Funnel: Views → Leads → Bookings → Deposits</h4>
          <div className="space-y-3">
            {[['Views', '12,400', '100%'], ['Leads', '120', '0.97%'], ['Bookings', '18', '15%'], ['Deposits', '12', '67%']].map(([s, v, c]) => (
              <div key={s} className="flex items-center gap-3">
                <span className="w-20 text-sm text-slate-500">{s}</span>
                <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden"><div className="h-full bg-gradient-to-r from-[#0F4C81] to-[#1a6bb5] rounded-lg" style={{ width: c }} /></div>
                <span className="text-sm font-bold tabular-nums w-16 text-right">{v}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function KanbanTemplate() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {pipelineStages.map((s) => (
        <div key={s.code} className="w-64 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">{s.label}</h4>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-medium">{s.count}</span>
          </div>
          <div className="space-y-2">
            {s.leads.map((name) => (
              <div key={name} className="glass-card rounded-xl p-3 cursor-grab hover:shadow-md">
                <p className="font-medium text-sm">{name}</p>
                {name === 'Thu Trang' && <div className="mt-2"><HotLeadBadge score={85} /></div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WizardTemplate({ uc }: { uc: UseCase }) {
  const steps = uc.screenType === 'import' ? ['Upload', 'Validate', 'Preview', 'Commit'] : ['Chọn unit', 'Nội dung', 'Media', 'Gửi duyệt'];
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= 1 ? 'bg-[#0F4C81] text-white' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</div>
            <span className="text-xs font-medium hidden sm:inline">{s}</span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-2" />}
          </div>
        ))}
      </div>
      <Panel className="text-center py-12 border-2 border-dashed border-slate-200">
        <Upload className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="font-semibold">{uc.screenType === 'import' ? 'Kéo thả Excel/CSV vào đây' : 'Upload ảnh/video listing'}</p>
        <p className="text-sm text-slate-500 mt-2">Max 100 units/request (P1) · Virus scan · Presigned S3</p>
        <Button className="mt-6" variant="outline">Chọn file</Button>
      </Panel>
    </div>
  );
}

function ModerationTemplate({ uc }: { uc: UseCase }) {
  return (
    <div className="space-y-4">
      {listings.filter((l) => l.status === 'PENDING_REVIEW' || uc.id === 'UC-LS-06').map((l) => (
        <Panel key={l.id} className={l.antiDrift === 'FLAG' ? 'ring-2 ring-orange-200' : ''}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold">{l.id}</span>
                <StatusBadge status={l.antiDrift} />
                {uc.id === 'UC-LS-06' && <StatusBadge status="FLAG" />}
              </div>
              <p className="text-sm text-slate-500 mt-1">{l.title} · Agent: {l.agent}</p>
              {l.antiDrift === 'FLAG' && (
                <div className="mt-3 flex items-center gap-2 text-sm text-orange-700 bg-orange-50 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-4 w-4" /> Giá listing lệch GR 5%
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Preview</Button>
              {l.antiDrift === 'PASS' ? <Button size="sm">Duyệt</Button> : <Button size="sm" variant="destructive">Reject</Button>}
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function AuditTemplate({ uc }: { uc: UseCase }) {
  return (
    <Panel className="p-0 overflow-hidden">
      <table className="data-table">
        <thead><tr><th>Event</th><th>Entity</th><th>Actor</th><th>Detail</th><th>Time</th></tr></thead>
        <tbody>
          {auditLogs.map((l) => (
            <tr key={l.id}>
              <td className="font-mono text-xs">{l.event}</td>
              <td>{l.entity}</td>
              <td>{l.actor}</td>
              <td>{l.detail}</td>
              <td className="text-slate-400">{l.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {uc.id === 'UC-BK-04' && <p className="p-4 text-sm text-slate-500 border-t">Replay mode · Export PDF evidence · Retention ≥5 năm</p>}
    </Panel>
  );
}

function BookingTemplate({ uc }: { uc: UseCase }) {
  const states = ['Draft', 'Reserved', 'Deposit Pending', 'Deposited', 'Contract Drafted', 'Completed'];
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Panel className="lg:col-span-2 space-y-6">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {states.map((s, i) => (
            <div key={s} className="flex items-center shrink-0">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${i <= 2 ? 'bg-[#0F4C81] text-white' : 'bg-slate-100 text-slate-400'}`}>{s}</div>
              {i < states.length - 1 && <div className="w-4 h-px bg-slate-200 mx-1" />}
            </div>
          ))}
        </div>
        <div className="space-y-3 border-l-2 border-[#0F4C81]/20 pl-4">
          {['BookingCreated · Nam · 15:00', 'InventoryLocked · System · 15:00', 'StateChanged RESERVED → DEPOSIT_PENDING · 15:30'].map((e) => (
            <p key={e} className="text-sm"><span className="font-mono text-xs text-slate-400">●</span> {e}</p>
          ))}
        </div>
        {uc.id === 'UC-BK-05' && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="font-semibold text-red-800">Hủy booking & hoàn tiền</p>
            <textarea className="w-full mt-3 rounded-lg border p-3 text-sm" placeholder="Lý do hủy..." rows={2} />
            <label className="flex items-center gap-2 text-sm mt-2"><input type="checkbox" defaultChecked /> Khởi tạo refund</label>
            <Button variant="destructive" className="mt-3" size="sm">Xác nhận hủy</Button>
          </div>
        )}
      </Panel>
      <Panel><FlowSteps steps={uc.flow} /></Panel>
    </div>
  );
}

function PaymentTemplate({ uc }: { uc: UseCase }) {
  return (
    <div className="max-w-lg mx-auto">
      <Panel className="text-center space-y-6">
        <CreditCard className="h-12 w-12 text-[#0F4C81] mx-auto" />
        <div>
          <p className="text-sm text-slate-500">Số tiền cọc</p>
          <p className="text-4xl font-bold text-[#0F4C81] tabular-nums mt-1">50.000.000 ₫</p>
        </div>
        <p className="text-sm text-slate-600">Căn A-12-05 · Vinhomes Grand Park · Booking #BK-018</p>
        <div className="grid grid-cols-2 gap-3">
          <Button className="w-full">VNPay</Button>
          <Button variant="outline" className="w-full">QR Code</Button>
        </div>
        <p className="text-xs text-slate-400">MFA OTP required · FR-ID-04 · Idempotent webhook</p>
        {uc.id === 'UC-PAY-07' && <p className="text-xs bg-indigo-50 text-indigo-700 rounded-lg p-2">BNPL Phase 5 · 3 kỳ trả góp</p>}
      </Panel>
    </div>
  );
}

function FinanceTemplate({ uc }: { uc: UseCase }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Gateway Total" value="500M" />
        <StatCard label="Ledger Total" value="500M" />
        <StatCard label="Status" value="MATCHED" highlight />
      </div>
      <Panel>
        <table className="data-table">
          <thead><tr><th>Account</th><th>Debit</th><th>Credit</th><th>Ref</th></tr></thead>
          <tbody>
            <tr><td>CASH_VNPAY / DEPOSIT_LIABILITY</td><td>50M</td><td>50M</td><td className="font-mono text-xs">pay_01</td></tr>
            <tr><td>DEPOSIT_LIABILITY / CASH_VNPAY</td><td>10M</td><td>10M</td><td className="font-mono text-xs">ref_01</td></tr>
          </tbody>
        </table>
      </Panel>
      {uc.module === 'COM' && <MockChart label="Commission settlement" />}
    </div>
  );
}

function LeadTemplate() {
  const lead = leads[0];
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Panel>
        <div className="flex items-center gap-3 mb-4"><HotLeadBadge score={lead.score} /><span className="font-bold text-xl">{lead.name}</span></div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[['SĐT', '090***4567'], ['Email', lead.email], ['Nguồn', lead.source], ['Stage', lead.stage]].map(([k, v]) => (
            <div key={k}><p className="text-slate-400 text-xs">{k}</p><p className="font-medium">{v}</p></div>
          ))}
        </div>
      </Panel>
      <Panel><FlowSteps steps={['Lead captured', 'AI score ≤3s', 'Tier HOT', 'Route agent', 'Notify']} /></Panel>
    </div>
  );
}

function ListingAITemplate({ uc }: { uc: UseCase }) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Panel className="lg:col-span-2 space-y-4">
        <input className="w-full h-11 rounded-xl border px-4" defaultValue="Căn 3PN view sông Block A" />
        <textarea className="w-full rounded-xl border p-4 text-sm h-32" defaultValue="Căn hộ cao cấp tầng 12, view sông thoáng mát..." />
        <label className="flex gap-2 text-sm"><input type="checkbox" /> Human approve AI content (FR-AI-04)</label>
      </Panel>
      <Panel className="space-y-4">
        <AIBanner />
        <Button className="w-full bg-[#C9A227] hover:bg-[#a8861f] text-white border-0">Tạo mô tả AI</Button>
        <p className="text-xs text-slate-400">P95 ≤8s · Cost cap per tenant · Guardrails enforced</p>
        {uc.id === 'UC-AI-03' && <p className="text-sm">RAG legal docs · Citations required · Phase 2</p>}
      </Panel>
    </div>
  );
}

function GoldenRecordTemplate() {
  return (
    <Panel className="p-0 overflow-hidden">
      <table className="data-table">
        <thead><tr><th>Code</th><th>Floor</th><th>Area</th><th>Price GR</th><th>Status</th><th>Version</th><th></th></tr></thead>
        <tbody>
          {units.map((u) => (
            <tr key={u.id}>
              <td className="font-mono font-semibold">{u.code}</td>
              <td>{u.floor}</td>
              <td>{u.area}m²</td>
              <td className="font-bold text-[#0F4C81]">{formatPrice(u.price)}</td>
              <td><StatusBadge status={u.status} /></td>
              <td className="font-mono text-xs text-slate-400">v4</td>
              <td><Button variant="ghost" size="sm">Edit</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function ProductGraphTemplate() {
  return (
    <Panel>
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0F4C81]/10 text-[#0F4C81] font-bold">
            <GitBranch className="h-5 w-5" /> Vinhomes Grand Park
          </div>
          <div className="flex gap-8 justify-center">
            {['Block A', 'Block B', 'Block C'].map((b) => (
              <div key={b} className="glass-card rounded-xl p-4 w-32 text-center">
                <Building2 className="h-8 w-8 text-[#0F4C81]/40 mx-auto mb-2" />
                <p className="font-semibold text-sm">{b}</p>
                <p className="text-xs text-slate-400">200 units</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function TimeTravelTemplate() {
  return (
    <Panel className="space-y-4">
      <div className="flex gap-4">
        <select className="h-11 rounded-xl border px-4 flex-1"><option>A-12-05</option></select>
        <input type="date" className="h-11 rounded-xl border px-4" defaultValue="2026-07-01" />
        <Button>Query snapshot</Button>
      </div>
      <table className="data-table">
        <thead><tr><th>Version</th><th>Price</th><th>Status</th><th>Changed by</th><th>At</th></tr></thead>
        <tbody>
          {[4, 3, 2, 1].map((v) => (
            <tr key={v}><td>v{v}</td><td>{formatPrice(3_500_000_000 + v * 100_000_000)}</td><td>AVAILABLE</td><td>usr_dev</td><td>2026-07-{20 + v}</td></tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function UsersTemplate({ uc }: { uc: UseCase }) {
  return (
    <Panel className="p-0 overflow-hidden">
      <table className="data-table">
        <thead><tr><th>User</th><th>Role</th><th>Scope</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {[['Hoàng Nam', 'AGENT', 'prj_01', 'ACTIVE'], ['Lan Hương', 'AGENCY_ADMIN', 'All', 'ACTIVE'], ['New Agent', 'AGENT', 'prj_02', 'INVITED']].map(([n, r, s, st]) => (
            <tr key={n}><td className="font-medium">{n}</td><td><span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{r}</span></td><td className="text-slate-500">{s}</td><td><StatusBadge status={st} /></td><td><Button variant="ghost" size="sm">Edit</Button></td></tr>
          ))}
        </tbody>
      </table>
      {uc.id === 'UC-CRM-02' && <p className="p-4 text-sm border-t text-slate-500">Round-robin · Hot priority queue · OI-07</p>}
    </Panel>
  );
}

function IntegrationTemplate({ uc }: { uc: UseCase }) {
  const icons: Record<string, string> = { 'UC-NW-01': '💬 Zalo OA', 'UC-NW-02': '📘 Meta Lead', 'UC-NW-03': '📱 SMS', 'UC-NW-04': '🔌 API Market', 'UC-NW-05': '🔗 Webhooks' };
  return (
    <Panel className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">{icons[uc.id]?.split(' ')[0] ?? '🔗'}</div>
        <div>
          <h3 className="font-bold text-lg">{icons[uc.id] ?? uc.title}</h3>
          <p className="text-sm text-slate-500">{uc.fr ?? 'Integration config'}</p>
        </div>
        <StatusBadge status="ACTIVE" />
      </div>
      <div className="space-y-3">
        <div><label className="text-xs text-slate-400">Webhook URL</label><input className="w-full h-10 rounded-lg border px-3 font-mono text-sm mt-1" defaultValue="https://api.wereal.vn/webhooks/..." readOnly /></div>
        <div><label className="text-xs text-slate-400">Secret / API Key</label><input className="w-full h-10 rounded-lg border px-3 font-mono text-sm mt-1" defaultValue="••••••••••••" readOnly /></div>
      </div>
      <Button className="mt-6">Test connection</Button>
    </Panel>
  );
}

function DisputeTemplate() {
  return (
    <Panel>
      <div className="flex items-center gap-3 mb-4"><Shield className="h-6 w-6 text-orange-500" /><h3 className="font-bold">Dispute #DSP-001</h3><StatusBadge status="FLAG" /></div>
      <p className="text-sm text-slate-600 mb-4">Booking #BK-018 · Double deposit claim · Evidence attached</p>
      <FlowSteps steps={['Open dispute', 'Attach timeline replay', 'Ops mediate', 'Resolution', 'Update ledger']} />
    </Panel>
  );
}

function DocumentsTemplate() {
  return (
    <Panel>
      <div className="grid grid-cols-3 gap-4">
        {['Hợp đồng mẫu.pdf', 'Pháp lý dự án.pdf', 'Bảng hàng Q3.xlsx'].map((f) => (
          <div key={f} className="glass-card rounded-xl p-4 text-center hover:shadow-md cursor-pointer">
            <FileText className="h-8 w-8 text-[#0F4C81]/40 mx-auto mb-2" />
            <p className="text-sm font-medium truncate">{f}</p>
            <p className="text-xs text-slate-400 mt-1">AES-256 · Watermark</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ContractTemplate({ uc }: { uc: UseCase }) {
  return (
    <Panel className="max-w-2xl mx-auto text-center space-y-6">
      <FileText className="h-16 w-16 text-[#0F4C81]/30 mx-auto" />
      <h3 className="font-bold text-xl">{uc.id === 'UC-BK-07' ? 'Ký hợp đồng điện tử' : 'Tạo hợp đồng từ template'}</h3>
      <p className="text-sm text-slate-500">Merge booking data · Preview PDF · E-sign provider webhook</p>
      <div className="flex gap-3 justify-center">
        <Button variant="outline">Preview PDF</Button>
        <Button>{uc.id === 'UC-BK-07' ? 'Ký ngay' : 'Gửi ký'}</Button>
      </div>
    </Panel>
  );
}

function ConfigTemplate({ uc }: { uc: UseCase }) {
  return (
    <Panel>
      <h3 className="font-bold mb-4">{uc.title}</h3>
      <div className="space-y-4 max-w-md">
        <div><label className="text-xs text-slate-400">Primary color</label><input type="color" defaultValue="#0F4C81" className="mt-1 h-10 w-full rounded" /></div>
        <div><label className="text-xs text-slate-400">Subdomain</label><input className="w-full h-10 rounded-lg border px-3 mt-1" defaultValue="agency-abc.wereal.vn" /></div>
        <Button>Lưu & Preview</Button>
      </div>
    </Panel>
  );
}

function MarketingTemplate({ uc }: { uc: UseCase }) {
  return (
    <div className="space-y-6">
      <Panel>
        <h3 className="font-bold mb-2">{uc.title}</h3>
        <MockChart label="Agency performance" />
      </Panel>
      {uc.id === 'UC-MKT-02' && (
        <div className="grid sm:grid-cols-2 gap-4">
          {['Vinhomes Q9', 'Masteri TD'].map((p) => (
            <Panel key={p} className="flex justify-between items-center">
              <span className="font-medium">{p}</span>
              <Button size="sm">Apply quyền bán</Button>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileTemplate() {
  return (
    <div className="max-w-sm mx-auto">
      <div className="rounded-[2rem] border-8 border-slate-800 bg-white overflow-hidden shadow-2xl">
        <div className="premium-gradient p-4 text-white text-center"><p className="font-bold">WEREAL Agent</p><p className="text-xs text-white/70">PWA · Offline cache</p></div>
        <div className="p-4 space-y-3">
          <StatCard label="Hot leads" value={5} highlight />
          <Button className="w-full" size="sm">Log activity (GPS)</Button>
          <Button className="w-full" variant="outline" size="sm">Quick booking</Button>
        </div>
      </div>
    </div>
  );
}

function BuyerTrackTemplate() {
  return (
    <Panel>
      <h3 className="font-bold mb-4">Deal của tôi — A-12-05</h3>
      <div className="space-y-4">
        {['RESERVED', 'DEPOSIT_PENDING', 'DEPOSITED'].map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <CheckCircle2 className={`h-5 w-5 ${i <= 1 ? 'text-emerald-500' : 'text-slate-300'}`} />
            <div><p className="font-medium text-sm">{s}</p><p className="text-xs text-slate-400">28/07/2026</p></div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function InboxTemplate() {
  return (
    <div className="grid lg:grid-cols-3 gap-4 h-[400px]">
      <Panel className="overflow-y-auto space-y-2">
        {['Zalo: Thu Trang', 'Email: Nguyen A', 'SMS: OTP sent'].map((t) => (
          <div key={t} className="p-3 rounded-xl bg-slate-50 hover:bg-[#0F4C81]/5 cursor-pointer text-sm font-medium">{t}</div>
        ))}
      </Panel>
      <Panel className="lg:col-span-2 flex flex-col">
        <div className="flex-1 bg-slate-50 rounded-xl p-4 text-sm text-slate-600">Thread unified inbox · Phase 3</div>
        <div className="flex gap-2 mt-4"><input className="flex-1 h-10 rounded-lg border px-3 text-sm" placeholder="AI draft reply..." /><Button size="sm">Send</Button></div>
      </Panel>
    </div>
  );
}

function Map3DTemplate() {
  return (
    <Panel className="h-96 flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 relative overflow-hidden rounded-2xl">
      <Globe className="h-24 w-24 text-[#0F4C81]/20" />
      <p className="absolute bottom-6 text-sm text-slate-500">Immersive 3D/Map discovery · Phase 6 · FR-UX-01</p>
    </Panel>
  );
}

function SystemTemplate({ uc }: { uc: UseCase }) {
  return (
    <Panel className="font-mono text-sm space-y-3">
      <p className="text-emerald-600">● System process — {uc.id}</p>
      {uc.flow.map((f) => (
        <p key={f} className="text-slate-600 pl-4 border-l-2 border-slate-200">{f}</p>
      ))}
      <div className="mt-4 p-3 bg-slate-900 text-green-400 rounded-xl text-xs">
        {`{"event":"${uc.module}_PROCESSED","status":"ok","latency_ms":42}`}
      </div>
    </Panel>
  );
}
