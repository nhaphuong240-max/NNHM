import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  Shield,
  Wallet,
  ShoppingBag,
  Grid3X3,
  ArrowRight,
  Sparkles,
  BarChart3,
  Landmark,
} from 'lucide-react';
import { USE_CASES } from '../config/useCases';
import { portalThemes } from '../config/designTokens';
import type { Portal } from '../config/useCases';

const portalCards: {
  id: Portal;
  title: string;
  subtitle: string;
  ucs: string[];
  to: string;
  featured?: boolean;
}[] = [
  {
    id: 'public',
    title: portalThemes.public.label,
    subtitle: 'FR-UX-01 · Buyer P4 Thu Trang',
    ucs: ['UC-LS-01', 'UC-LS-05', 'UC-CRM-01', 'UC-LS-03'],
    to: '/uc/UC-LS-01',
  },
  {
    id: 'agent',
    title: portalThemes.agent.label,
    subtitle: 'FR-UX-02 · P3 Hoàng Nam',
    ucs: ['UC-AN-01', 'UC-CRM-03', 'UC-AI-01', 'UC-BK-01'],
    to: '/uc/UC-AN-01',
  },
  {
    id: 'admin',
    title: portalThemes.admin.label,
    subtitle: 'FR-UX-03 · P5 Quốc Bảo',
    ucs: ['UC-UX-03', 'UC-LS-02', 'UC-TR-01', 'UC-ID-01'],
    to: '/uc/UC-UX-03',
  },
  {
    id: 'developer',
    title: portalThemes.developer.label,
    subtitle: 'FR-UX-04 · P1 Minh Tuấn · Golden Record',
    ucs: ['UC-UX-04', 'UC-GR-01', 'UC-GR-06', 'UC-AN-03', 'UC-MKT-01', 'UC-COM-01'],
    to: '/developer',
    featured: true,
  },
  {
    id: 'finance',
    title: portalThemes.finance.label,
    subtitle: 'P6 Kim Anh · Ledger & Reconcile',
    ucs: ['UC-PAY-02', 'UC-PAY-03', 'UC-COM-05', 'UC-PAY-04'],
    to: '/uc/UC-PAY-02',
  },
  {
    id: 'buyer',
    title: portalThemes.buyer.label,
    subtitle: 'Deal tracking · Payment',
    ucs: ['UC-PAY-01', 'UC-BK-02', 'UC-BK-07', 'UC-UX-02'],
    to: '/uc/UC-PAY-01',
  },
];

const portalIcons: Record<Portal, typeof Building2> = {
  public: Building2,
  agent: Users,
  admin: Shield,
  developer: Building2,
  finance: Wallet,
  buyer: ShoppingBag,
  auth: Grid3X3,
  system: Grid3X3,
};

export default function PortalHub() {
  const p1Count = USE_CASES.filter((u) => u.phase === 1).length;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="premium-gradient text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zMCAwaDEwdjEwSDMweiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMDMiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-50" />
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-16 lg:py-24 relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-sm ring-1 ring-white/20 mb-6">
                <Sparkles className="h-4 w-4 text-[#C9A227]" />
                Prototype v2.0 · Premium Edition
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                WEREAL REOS
                <span className="block text-2xl lg:text-3xl font-normal text-white/80 mt-2">Real Estate Operating System</span>
              </h1>
              <p className="text-white/70 mt-4 max-w-xl text-lg leading-relaxed">
                Interactive prototype — <strong className="text-white">{USE_CASES.length} use cases</strong> đầy đủ,
                design system PropTech Professional, 6 portals.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/catalog"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#0F4C81] font-semibold px-6 py-3.5 rounded-xl hover:bg-white/90 transition-colors shadow-lg"
              >
                <Grid3X3 className="h-5 w-5" />
                Use Case Catalog ({USE_CASES.length})
              </Link>
              <Link
                to="/developer"
                className="inline-flex items-center justify-center gap-2 bg-[#C9A227] text-[#0F4C81] font-semibold px-6 py-3.5 rounded-xl hover:bg-[#e8c547] transition-colors shadow-lg"
              >
                <Landmark className="h-5 w-5" />
                Portal Chủ đầu tư
              </Link>
              <Link
                to="/design-system"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/20 ring-1 ring-white/20 transition-colors"
              >
                Design System
              </Link>
              <Link
                to="/auth/login"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/20 ring-1 ring-white/20 transition-colors"
              >
                Đăng nhập Demo
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
            {[
              ['58', 'Use Cases'],
              [String(p1Count), 'Phase 1 MVP'],
              ['13', 'Modules'],
              ['6', 'Portals'],
            ].map(([v, l]) => (
              <div key={l} className="bg-white/10 backdrop-blur rounded-2xl p-4 ring-1 ring-white/10">
                <p className="text-3xl font-bold">{v}</p>
                <p className="text-sm text-white/60 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Portals */}
      <main className="max-w-6xl mx-auto px-4 lg:px-8 py-12 lg:py-16">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-2">
          <h2 className="text-2xl font-bold text-slate-900">Chọn Portal</h2>
          <div className="flex items-center gap-3">
            <Link to="/catalog" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
              <BarChart3 className="h-4 w-4" /> Xem tất cả UC
            </Link>
            <Link to="/design-system" className="text-sm text-primary font-medium hover:underline">
              Design System →
            </Link>
          </div>
        </div>

        {/* Portal Chủ đầu tư — highlight */}
        <Link to="/developer" className="block mb-8 group">
          <div className="rounded-2xl premium-gradient p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <p className="text-[#C9A227] text-sm font-semibold uppercase tracking-wider">Module Chủ đầu tư · FR-UX-04</p>
                <h2 className="text-2xl lg:text-3xl font-bold mt-2">Portal Chủ đầu tư (Developer)</h2>
                <p className="text-white/75 mt-2 max-w-xl">
                  Golden Record, bảng hàng, absorption, phân phối agency, hoa hồng — Persona P1 Minh Tuấn
                </p>
                <p className="text-sm text-white/60 mt-3">13 use cases · 5 nhóm module nghiệp vụ</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {['UC-GR-01', 'UC-GR-04', 'UC-GR-06', 'UC-AN-03', 'UC-MKT-01', 'UC-COM-01'].map((id) => (
                  <span key={id} className="text-xs font-mono bg-white/15 px-2 py-1 rounded-md ring-1 ring-white/20">{id}</span>
                ))}
              </div>
            </div>
          </div>
        </Link>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {portalCards.filter((p) => !p.featured).map((p) => {
            const theme = portalThemes[p.id];
            const Icon = portalIcons[p.id];
            return (
              <Link key={p.id} to={p.to}>
                <div
                  className="group h-full rounded-2xl border border-border bg-white p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30"
                  style={{ borderLeftWidth: 4, borderLeftColor: theme.accent }}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: theme.accent }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-lg font-bold mt-5 text-slate-900">{p.title}</h3>
                  <p className="text-xs text-muted mt-1">{p.subtitle}</p>
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {p.ucs.map((id) => (
                      <span key={id} className="text-[10px] font-mono bg-secondary text-slate-600 px-2 py-0.5 rounded-md ring-1 ring-border">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Module overview */}
        <div className="mt-16 glass-card rounded-2xl p-6 lg:p-8">
          <h3 className="font-bold text-lg mb-4">13 Module nghiệp vụ · Phase 1–6</h3>
          <div className="flex flex-wrap gap-2">
            {['GR', 'ID', 'LS', 'CRM', 'BK', 'PAY', 'COM', 'AI', 'TR', 'AN', 'MKT', 'UX', 'NW'].map((m) => {
              const count = USE_CASES.filter((u) => u.module === m).length;
              return (
                <Link
                  key={m}
                  to={`/catalog?module=${m}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-[#0F4C81]/5 hover:text-[#0F4C81] text-sm font-medium ring-1 ring-slate-200/80 transition-colors"
                >
                  {m}
                  <span className="text-xs bg-white px-1.5 py-0.5 rounded-md text-slate-500">{count}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        WEREAL-UI-2026-v2.0 · Baseline WEREAL-BL-2026-002 · Mockup-UI-mau.md
      </footer>
    </div>
  );
}
