import { Link } from 'react-router-dom';
import { getSession, logout } from '../lib/auth';
import { brand } from '../theme/tokens';
import { PortalNav, type PortalNavLink } from './PortalNav';

export function AppChrome({
  portalLabel,
  mark,
  accent,
  title,
  subtitle,
  screenTag,
  primary,
  advanced,
  logoutHref = '/auth/login',
  compact = false,
  children,
}: {
  portalLabel: string;
  mark: string;
  accent: string;
  title: string;
  subtitle?: string;
  screenTag?: string;
  primary: PortalNavLink[];
  advanced?: PortalNavLink[];
  logoutHref?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const session = getSession();

  const userChip = session ? (
    <button
      type="button"
      className="w-full rounded-xl px-3 py-2 text-left text-xs font-medium"
      style={{ background: brand.secondary, color: brand.primary }}
      onClick={() => {
        void logout().finally(() => {
          window.location.href = logoutHref;
        });
      }}
    >
      <span className="block truncate">{session.email}</span>
      <span style={{ color: brand.muted }}>Đăng xuất</span>
    </button>
  ) : (
    <Link to={logoutHref} className="text-sm font-medium underline" style={{ color: brand.primary }}>
      Đăng nhập
    </Link>
  );

  if (compact) {
    return (
      <div className="min-h-screen" style={{ background: brand.background }}>
        <header className="text-white" style={{ background: accent }}>
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] opacity-70">{portalLabel}</p>
              <h1 className="text-lg font-bold tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm opacity-80 mt-0.5">{subtitle}</p>}
            </div>
            <PortalNav primary={primary} advanced={advanced} />
          </div>
        </header>
        <main className="max-w-lg mx-auto p-4">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]" style={{ background: brand.background }}>
      <aside
        className="hidden lg:flex flex-col p-5 sticky top-0 h-screen"
        style={{ background: brand.surface, borderRight: `1px solid ${brand.border}` }}
      >
        <Link to="/" className="flex items-center gap-3 mb-8 no-underline">
          <span
            className="w-10 h-10 rounded-xl grid place-items-center text-[11px] font-extrabold tracking-wide"
            style={{ background: brand.accent, color: brand.primaryDark }}
          >
            {mark}
          </span>
          <span>
            <span className="block text-sm font-extrabold tracking-tight" style={{ color: brand.ink }}>
              NNHN
            </span>
            <span className="block text-[11px]" style={{ color: brand.muted }}>
              {portalLabel}
            </span>
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <PortalNav primary={primary} advanced={advanced} stacked />
        </div>
        <div className="pt-4">{userChip}</div>
      </aside>

      <div className="min-w-0">
        <header
          className="lg:hidden text-white px-4 py-3"
          style={{ background: accent }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] opacity-70">{portalLabel}</p>
              <p className="font-bold">{title}</p>
            </div>
            {session ? (
              <button
                type="button"
                className="rounded-full px-3 py-1.5 text-xs"
                style={{ background: 'rgba(255,255,255,0.16)' }}
                onClick={() => {
                  void logout().finally(() => {
                    window.location.href = logoutHref;
                  });
                }}
              >
                Đăng xuất
              </button>
            ) : (
              <Link to={logoutHref} className="text-sm underline">
                Đăng nhập
              </Link>
            )}
          </div>
          <div className="mt-3 overflow-x-auto">
            <PortalNav primary={primary} advanced={advanced} />
          </div>
        </header>

        <div className="px-4 lg:px-8 pt-6 lg:pt-8 pb-2">
          {screenTag && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-1" style={{ color: brand.muted }}>
              {screenTag}
            </p>
          )}
          <h1 className="text-2xl lg:text-[1.75rem] font-extrabold tracking-tight" style={{ color: brand.ink }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm mt-1 max-w-2xl" style={{ color: brand.muted }}>
              {subtitle}
            </p>
          )}
        </div>
        <main className="px-4 lg:px-8 pb-10 pt-4 max-w-[1280px]">{children}</main>
      </div>
    </div>
  );
}
