import { Link } from 'react-router-dom';
import { brand, finance } from '../../theme/tokens';

const portals = [
  {
    to: '/public/search',
    label: 'Khách hàng',
    desc: 'Tìm căn, so sánh, giữ chỗ',
    color: brand.primary,
  },
  {
    to: '/auth/login?portal=agent',
    label: 'Sale / Agent',
    desc: 'Inbox · lead · giữ chỗ',
    color: brand.primaryLight,
  },
  {
    to: '/auth/login?portal=developer',
    label: 'Chủ đầu tư',
    desc: 'Bảng hàng GR · hoa hồng',
    color: brand.primaryDark,
  },
  {
    to: '/auth/login?portal=finance',
    label: 'Finance',
    desc: 'Đối soát · settlement',
    color: finance.accentDark,
  },
  {
    to: '/auth/login?portal=admin',
    label: 'Ops / Admin',
    desc: 'Queue payment · lock · drift',
    color: brand.primaryDark,
  },
];

export function OpsPortalsPage() {
  return (
    <div className="min-h-screen" style={{ background: brand.background }}>
      <header className="px-6 py-10 lg:px-16 lg:py-12" style={{ background: brand.primaryDark, color: '#fff' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: brand.hover }}>
          Đối tác
        </p>
        <h1 className="mt-3 text-3xl lg:text-4xl font-extrabold tracking-tight max-w-2xl">
          Cổng vận hành
        </h1>
        <p className="mt-4 max-w-lg text-sm opacity-80">
          Giữ chỗ, cọc, sổ cái và hoa hồng. Dành cho sale, CĐT, finance và ops — không phải trang khách.
        </p>
        <Link to="/" className="inline-block mt-6 text-sm font-semibold" style={{ color: brand.hover }}>
          ← Về trang tìm nhà
        </Link>
      </header>

      <main className="px-6 lg:px-16 py-10 max-w-6xl">
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portals.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className="rounded-2xl p-5 block no-underline text-white"
              style={{ background: p.color }}
            >
              <p className="text-lg font-bold">{p.label}</p>
              <p className="text-sm mt-1 opacity-85">{p.desc}</p>
            </Link>
          ))}
          <Link
            to="/buyer/deals"
            className="rounded-2xl p-5 block no-underline"
            style={{ background: brand.surface, border: `1px solid ${brand.border}`, color: brand.ink }}
          >
            <p className="text-lg font-bold">Buyer</p>
            <p className="text-sm mt-1" style={{ color: brand.muted }}>
              Deal tracker · e-sign phiếu cọc
            </p>
          </Link>
        </section>
      </main>
    </div>
  );
}
