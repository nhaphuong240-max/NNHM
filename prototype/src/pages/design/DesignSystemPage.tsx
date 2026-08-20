import { Link } from 'react-router-dom';
import {
  brand,
  components,
  layout,
  portalThemes,
  semantic,
  typography,
} from '../../config/designTokens';
import { PremiumShell, ContentArea, PageHero } from '../../components/premium/PremiumShell';
import { StatCard } from '../../components/premium/PremiumUI';

const colorRows = [
  { name: 'Primary', token: '--color-primary', hex: brand.primary, usage: 'CTA, header, link, active nav' },
  { name: 'Accent (Gold)', token: '--color-accent', hex: brand.accent, usage: 'Giá VIP, KPI highlight, premium' },
  { name: 'Secondary', token: '--color-secondary', hex: brand.secondary, usage: 'Section background, hover' },
  { name: 'Success', token: '--color-success', hex: brand.success, usage: 'Verified, available, paid' },
  { name: 'Warning', token: '--color-warning', hex: brand.warning, usage: 'HOT lead, expiry, pending' },
  { name: 'Destructive', token: '--color-destructive', hex: brand.destructive, usage: 'Error, reject, cancel' },
  { name: 'Muted', token: '--color-muted', hex: brand.muted, usage: 'Caption, placeholder' },
  { name: 'Background', token: '--color-background', hex: brand.background, usage: 'Page canvas' },
  { name: 'Border', token: '--color-border', hex: brand.border, usage: 'Divider, input border' },
];

export default function DesignSystemPage() {
  return (
    <PremiumShell
      portal="admin"
      title="Design System"
      subtitle="WEREAL REOS v2.1"
      userMenu="UX Team"
      nav={[
        { to: '/design-system', label: 'Tổng quan', end: true },
        { to: '/catalog', label: 'Use Cases' },
        { to: '/', label: 'Portal Hub' },
      ]}
    >
      <PageHero
        title="WEREAL Design System"
        description="Chuẩn màu sắc, typography, layout và component — áp dụng thống nhất 8 portal. Tài liệu: docs/specs/WEREAL-Design-System-Spec.md"
        badge={
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            PropTech Professional · Phase 1 Light
          </span>
        }
        actions={
          <Link to="/" className={components.btnSecondary}>
            ← Portal Hub
          </Link>
        }
      />

      <ContentArea className={layout.sectionGap}>
        {/* Colors */}
        <section className={components.card}>
          <h2 className={typography.h2}>1. Bảng màu (Color Tokens)</h2>
          <p className={`${typography.bodySm} mt-2 mb-6`}>
            Một bộ brand cốt lõi — portal chỉ khác accent nhẹ, không dùng palette riêng (indigo/emerald lẻ).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {colorRows.map((c) => (
              <div key={c.name} className="flex gap-3 p-3 rounded-xl border border-border bg-white">
                <div
                  className="h-14 w-14 rounded-lg shrink-0 ring-1 ring-black/5"
                  style={{ backgroundColor: c.hex }}
                />
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="font-mono text-xs text-slate-500">{c.hex}</p>
                  <p className="text-xs text-slate-400 mt-1">{c.usage}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Semantic */}
        <section className={components.card}>
          <h2 className={typography.h2}>2. Màu ngữ nghĩa (Semantic)</h2>
          <div className="flex flex-wrap gap-3 mt-4">
            {Object.entries(semantic).map(([key, s]) => (
              <span
                key={key}
                className="px-3 py-1.5 rounded-lg text-sm font-medium ring-1 ring-inset"
                style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
              >
                {key}
              </span>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className={components.card}>
          <h2 className={typography.h2}>3. Typography</h2>
          <div className="mt-4 space-y-4 border-l-2 border-primary/20 pl-6">
            <p className={typography.displayLg}>Display — Tìm căn hộ mơ ước</p>
            <p className={typography.h1}>Heading 1 — Quản lý Golden Record</p>
            <p className={typography.h2}>Heading 2 — Pipeline CRM</p>
            <p className={typography.h3}>Heading 3 — Thông tin căn hộ</p>
            <p className={typography.bodyLg}>Body large — Mô tả dự án và tiện ích xung quanh.</p>
            <p className={typography.bodySm}>Body small — Cập nhật 28/07/2026 · Agent Hoàng Nam</p>
            <p className={typography.price}>3.500.000.000 ₫</p>
            <p className={typography.mono}>bk_018 · ld_042 · audit_evt_991</p>
          </div>
        </section>

        {/* Layout */}
        <section className={components.card}>
          <h2 className={typography.h2}>4. Layout & Grid</h2>
          <ul className={`${typography.bodySm} mt-3 space-y-2 list-disc pl-5`}>
            <li>Max content width: <strong>1600px</strong> — căn giữa</li>
            <li>Header cao: <strong>64px</strong> · Sidebar: <strong>256px</strong> (lg+)</li>
            <li>Padding vùng nội dung: <strong>16px mobile / 32px desktop</strong></li>
            <li>KPI grid: 2 cột mobile → 4 cột desktop</li>
            <li>Public portal: top tabs (desktop) + bottom nav (mobile)</li>
          </ul>
          <div className={`${layout.gridCols.kpi} mt-6`}>
            <StatCard label="Leads hôm nay" value={24} trend="+12%" />
            <StatCard label="Booking active" value={8} />
            <StatCard label="GMV tháng" value="12.4 tỷ" highlight />
            <StatCard label="Conversion" value="4.2%" />
          </div>
        </section>

        {/* Components */}
        <section className={components.card}>
          <h2 className={typography.h2}>5. Components</h2>
          <div className="flex flex-wrap gap-3 mt-4">
            <button type="button" className={components.btnPrimary}>
              Primary CTA
            </button>
            <button type="button" className={components.btnSecondary}>
              Secondary
            </button>
            <button type="button" className={components.btnAccent}>
              Accent / Premium
            </button>
            <button type="button" className={components.btnDestructive}>
              Hủy booking
            </button>
          </div>
          <input className={`${components.input} max-w-md mt-6`} placeholder="Tìm dự án, quận..." />
        </section>

        {/* Portal themes */}
        <section className={components.card}>
          <h2 className={typography.h2}>6. Portal Themes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {(Object.entries(portalThemes) as [string, (typeof portalThemes)[keyof typeof portalThemes]][]).map(
              ([key, theme]) => (
                <div key={key} className="rounded-xl border border-border overflow-hidden">
                  <div
                    className={`h-12 flex items-center px-4 text-sm font-semibold text-white ${
                      theme.headerVariant === 'brand' ? 'premium-gradient' : 'bg-white text-primary border-b border-border'
                    }`}
                    style={theme.headerVariant === 'light' ? { color: brand.primary } : undefined}
                  >
                    {theme.label}
                  </div>
                  <div className="p-4 text-sm">
                    <p className="text-slate-600">{theme.description}</p>
                    <div className="flex gap-2 mt-3 items-center">
                      <span className="text-xs text-slate-400">Accent:</span>
                      <span
                        className="h-5 w-5 rounded ring-1 ring-black/10"
                        style={{ backgroundColor: theme.accent }}
                      />
                      <span className="font-mono text-xs">{theme.accent}</span>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      </ContentArea>
    </PremiumShell>
  );
}
