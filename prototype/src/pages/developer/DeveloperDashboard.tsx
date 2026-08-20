import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Grid3X3,
  GitBranch,
  Upload,
  History,
  BarChart3,
  TrendingUp,
  Megaphone,
  Trophy,
  Percent,
  FileText,
  Webhook,
  Building2,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { USE_CASES, type UseCase } from '../../config/useCases';
import { PremiumShell, PageHero, ContentArea } from '../../components/premium/PremiumShell';
import { StatCard, PhaseBadge, UCBadge } from '../../components/premium/PremiumUI';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatPrice } from '../../data/mock';

/** Tất cả UC thuộc portal Chủ đầu tư (Developer Admin — P1 Minh Tuấn) */
export const DEVELOPER_USE_CASES = USE_CASES.filter((u) => u.portal === 'developer');

const moduleGroups: {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  ucs: string[];
}[] = [
  {
    id: 'gr',
    title: 'Golden Record & Bảng hàng',
    description: 'Quản lý unit gốc, Product Graph, import, lịch sử giá',
    icon: Grid3X3,
    ucs: ['UC-GR-01', 'UC-GR-04', 'UC-GR-05', 'UC-GR-06', 'UC-UX-04'],
  },
  {
    id: 'analytics',
    title: 'Báo cáo & Absorption',
    description: 'Tồn kho, tốc độ tiêu thụ, dự báo, attribution',
    icon: BarChart3,
    ucs: ['UC-AN-03', 'UC-AN-04', 'UC-AN-05'],
  },
  {
    id: 'distribution',
    title: 'Phân phối & Marketplace',
    description: 'Policy phân phối, leaderboard agency, compliance',
    icon: Megaphone,
    ucs: ['UC-MKT-01', 'UC-MKT-03'],
  },
  {
    id: 'commission',
    title: 'Chính sách hoa hồng',
    description: 'Commission policy theo project, split rules',
    icon: Percent,
    ucs: ['UC-COM-01'],
  },
  {
    id: 'docs',
    title: 'Tài liệu & Tích hợp',
    description: 'Document Vault, webhook tenant',
    icon: FileText,
    ucs: ['UC-TR-02', 'UC-NW-05'],
  },
];

const developerNav = [
  { to: '/developer', label: 'Tổng quan', end: true },
  { to: '/uc/UC-GR-01', label: 'Bảng hàng GR' },
  { to: '/uc/UC-GR-04', label: 'Product Graph' },
  { to: '/uc/UC-GR-06', label: 'Import Excel' },
  { to: '/uc/UC-AN-03', label: 'Absorption' },
  { to: '/uc/UC-MKT-01', label: 'Phân phối' },
  { to: '/uc/UC-COM-01', label: 'Hoa hồng' },
  { to: '/uc/UC-TR-02', label: 'Tài liệu' },
];

export default function DeveloperDashboard() {
  return (
    <PremiumShell
      portal="developer"
      title="Portal Chủ đầu tư"
      subtitle="Developer Admin · Vinhomes Pilot · P1 Minh Tuấn"
      nav={developerNav}
      userMenu="Minh Tuấn"
    >
      <PageHero
        title="Portal Chủ đầu tư"
        description="FR-UX-04 · Golden Record là nguồn sự thật duy nhất — Agency chỉ đọc, CĐT kiểm soát giá & tồn kho"
        badge={
          <div className="flex flex-wrap gap-2">
            <UCBadge id="UC-UX-04" />
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold">
              <Building2 className="h-3 w-3" /> Tenant: Dev Pilot Vinhomes
            </span>
          </div>
        }
        actions={
          <>
            <Link to="/uc/UC-GR-06"><Button variant="outline" size="sm"><Upload className="h-4 w-4" /> Import bảng hàng</Button></Link>
            <Link to="/uc/UC-GR-01"><Button size="sm"><Grid3X3 className="h-4 w-4" /> Quản lý GR</Button></Link>
          </>
        }
      />

      <ContentArea>
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard label="Tổng căn" value="1.200" trend="Vinhomes Grand Park" icon={<Building2 className="h-5 w-5" />} />
          <StatCard label="Còn hàng" value="845" trend="70.4% inventory" />
          <StatCard label="Đã giữ / Cọc" value="128" highlight />
          <StatCard label="Absorption T7" value="12.3%" trend="+2.1% vs T6" icon={<TrendingUp className="h-5 w-5" />} />
        </div>

        {/* SSE live indicator — UC-GR-07 */}
        <Link to="/uc/UC-GR-07" className="block mb-10">
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 px-5 py-4 hover:shadow-md transition-shadow">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-emerald-900">Real-time inventory · SSE</p>
              <p className="text-sm text-emerald-700/80">Cập nhật trạng thái unit ≤5s · UC-GR-07 · FR-GR-08</p>
            </div>
            <StatusBadge status="AVAILABLE" />
            <ChevronRight className="h-5 w-5 text-emerald-600" />
          </div>
        </Link>

        {/* Module groups */}
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-[#0F4C81]" />
          Module nghiệp vụ Chủ đầu tư
          <span className="text-sm font-normal text-slate-400">({DEVELOPER_USE_CASES.length} use cases)</span>
        </h2>

        <div className="space-y-8">
          {moduleGroups.map((group) => (
            <section key={group.id} className="glass-card rounded-2xl p-6 lg:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-[#0F4C81]/10 flex items-center justify-center shrink-0">
                  <group.icon className="h-6 w-6 text-[#0F4C81]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{group.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{group.description}</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.ucs.map((ucId) => {
                  const uc = USE_CASES.find((u) => u.id === ucId);
                  if (!uc) return null;
                  return <DeveloperUCCard key={ucId} uc={uc} />;
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Quick preview GR grid */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Bảng hàng nhanh — Golden Record</h3>
            <Link to="/uc/UC-GR-01" className="text-sm text-[#0F4C81] font-medium hover:underline">Xem đầy đủ →</Link>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã căn</th>
                  <th>Tầng</th>
                  <th>Diện tích</th>
                  <th>Giá GR 🔒</th>
                  <th>Trạng thái</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['A-12-05', 12, '85.5m²', 3_500_000_000, 'AVAILABLE', 'v4'],
                  ['A-01-01', 1, '50m²', 2_000_000_000, 'AVAILABLE', 'v3'],
                  ['B-08-12', 8, '82m²', 3_200_000_000, 'RESERVED', 'v4'],
                  ['C-15-03', 15, '72m²', 4_800_000_000, 'SOLD', 'v2'],
                ].map(([code, floor, area, price, status, ver]) => (
                  <tr key={String(code)}>
                    <td className="font-mono font-semibold">{code}</td>
                    <td>{floor}</td>
                    <td>{area}</td>
                    <td className="font-bold text-[#0F4C81] tabular-nums">{formatPrice(price as number)}</td>
                    <td><StatusBadge status={status as string} /></td>
                    <td className="font-mono text-xs text-slate-400">{ver}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Agency <strong>không</strong> được sửa giá GR (CON-09, BR-01) · Chỉ CĐT cập nhật qua portal này
          </p>
        </section>

        {/* Shortcut icons row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-10">
          {[
            { icon: GitBranch, label: 'Product Graph', to: '/uc/UC-GR-04' },
            { icon: History, label: 'Time-travel', to: '/uc/UC-GR-05' },
            { icon: Upload, label: 'Import', to: '/uc/UC-GR-06' },
            { icon: BarChart3, label: 'Absorption', to: '/uc/UC-AN-03' },
            { icon: Trophy, label: 'Leaderboard', to: '/uc/UC-MKT-03' },
            { icon: Webhook, label: 'Webhooks', to: '/uc/UC-NW-05' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-[#0F4C81]/30 hover:shadow-md transition-all text-center"
            >
              <item.icon className="h-6 w-6 text-[#0F4C81]" />
              <span className="text-xs font-medium text-slate-700">{item.label}</span>
            </Link>
          ))}
        </div>
      </ContentArea>
    </PremiumShell>
  );
}

function DeveloperUCCard({ uc }: { uc: UseCase }) {
  return (
    <Link
      to={`/uc/${uc.id}`}
      className="group flex items-center gap-3 p-4 rounded-xl bg-slate-50/80 hover:bg-[#0F4C81]/5 border border-slate-100 hover:border-[#0F4C81]/20 transition-all"
    >
      <UCBadge id={uc.id} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-[#0F4C81]">{uc.title}</p>
        <div className="mt-1"><PhaseBadge phase={uc.phase} /></div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#0F4C81] shrink-0" />
    </Link>
  );
}

export { developerNav };
