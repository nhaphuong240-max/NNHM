import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Users,
  Building2,
  Shield,
  Wallet,
  ShoppingBag,
  Grid3X3,
  LogIn,
  ChevronRight,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Portal } from '../../config/useCases';
import { USE_CASES } from '../../config/useCases';
import { getPortalTheme, layout } from '../../config/designTokens';

const portalIcons: Record<Portal, LucideIcon> = {
  public: Search,
  agent: Users,
  admin: Shield,
  developer: Building2,
  finance: Wallet,
  buyer: ShoppingBag,
  auth: LogIn,
  system: Grid3X3,
};

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

interface PremiumShellProps {
  portal: Portal;
  title?: string;
  subtitle?: string;
  userMenu?: string;
  nav?: NavItem[];
  ucId?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function PremiumShell({
  portal,
  title,
  subtitle,
  userMenu,
  nav = [],
  ucId,
  children,
  fullWidth,
}: PremiumShellProps) {
  const theme = getPortalTheme(portal);
  const Icon = portalIcons[portal];
  const location = useLocation();
  const portalUcs = USE_CASES.filter((u) => u.portal === portal).slice(0, 6);
  const isLightHeader = theme.headerVariant === 'light';

  return (
    <div className="min-h-screen flex flex-col" data-portal={portal}>
      <header
        className={cn(
          'shadow-md',
          isLightHeader
            ? 'bg-white border-b border-border text-slate-900'
            : 'premium-gradient text-white shadow-lg',
        )}
      >
        <div className={cn(layout.maxWidth, 'mx-auto px-4 lg:px-6')}>
          <div className={cn(layout.headerHeight, 'flex items-center justify-between gap-4')}>
            <div className="flex items-center gap-4 min-w-0">
              <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
                <div
                  className={cn(
                    'h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ring-1 transition-colors',
                    isLightHeader
                      ? 'bg-primary text-white ring-primary/20'
                      : 'bg-white/15 backdrop-blur text-white ring-white/20 group-hover:bg-white/25',
                  )}
                >
                  W
                </div>
                <div className="hidden sm:block">
                  <span className="font-bold tracking-tight">WEREAL</span>
                  <span
                    className={cn('text-xs block -mt-0.5', isLightHeader ? 'text-muted' : 'text-white/50')}
                  >
                    REOS Platform
                  </span>
                </div>
              </Link>
              <ChevronRight
                className={cn('h-4 w-4 hidden md:block shrink-0', isLightHeader ? 'text-slate-300' : 'text-white/30')}
              />
              <div className="hidden md:flex items-center gap-2 min-w-0">
                <Icon className={cn('h-4 w-4 shrink-0', isLightHeader ? 'text-primary' : 'text-white/70')} />
                <span className="text-sm font-medium truncate">{title ?? theme.label}</span>
                {subtitle && (
                  <span className={cn('text-sm truncate', isLightHeader ? 'text-muted' : 'text-white/50')}>
                    · {subtitle}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/design-system"
                className={cn(
                  'hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ring-1',
                  isLightHeader
                    ? 'text-primary hover:bg-secondary ring-primary/20'
                    : 'bg-white/10 hover:bg-white/20 text-white ring-white/10',
                )}
              >
                Design System
              </Link>
              <Link
                to="/catalog"
                className={cn(
                  'hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ring-1',
                  isLightHeader
                    ? 'text-slate-600 hover:bg-slate-50 ring-border'
                    : 'bg-white/10 hover:bg-white/20 text-white ring-white/10',
                )}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                {USE_CASES.length} UC
              </Link>
              {ucId && (
                <span className="hidden lg:inline text-xs font-mono bg-accent/20 text-amber-900 px-2 py-1 rounded-md ring-1 ring-accent/30">
                  {ucId}
                </span>
              )}
              {userMenu && (
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-full pl-3 pr-1 py-1 ring-1',
                    isLightHeader ? 'bg-secondary ring-border' : 'bg-white/10 ring-white/10',
                  )}
                >
                  <span className="text-sm hidden sm:inline">{userMenu}</span>
                  <div className="h-7 w-7 rounded-full premium-gradient-gold flex items-center justify-center text-xs font-bold text-white">
                    {userMenu.charAt(0)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className={cn('flex flex-1 mx-auto w-full', layout.maxWidth)}>
        {portal !== 'auth' && portal !== 'public' && (
          <aside
            className={cn(
              'hidden lg:flex flex-col border-r border-border bg-white/80 backdrop-blur shrink-0',
              layout.sidebarWidth,
            )}
            style={{ borderLeftWidth: 3, borderLeftColor: theme.accent }}
          >
            <div className="p-4 border-b border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">{theme.label}</p>
              <Link to="/catalog" className="text-xs text-muted hover:text-primary flex items-center gap-1 mt-1">
                <LayoutDashboard className="h-3 w-3" /> Use Case Catalog
              </Link>
            </div>
            {nav.length > 0 && (
              <nav className="p-3 space-y-0.5 flex-1">
                {nav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                        isActive ? 'font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                      )
                    }
                    style={({ isActive }) =>
                      isActive
                        ? {
                            backgroundColor: theme.accentSoft,
                            color: theme.accent,
                            borderLeft: `2px solid ${theme.accent}`,
                          }
                        : undefined
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            )}
            <div className="p-3 border-t border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold px-3 mb-2">Related UCs</p>
              <div className="space-y-1">
                {portalUcs.map((uc) => (
                  <Link
                    key={uc.id}
                    to={`/uc/${uc.id}`}
                    className={cn(
                      'block px-3 py-1.5 text-xs rounded-lg transition-colors',
                      location.pathname === `/uc/${uc.id}`
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted hover:bg-slate-50',
                    )}
                  >
                    {uc.id}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        )}

        {portal === 'public' && nav.length > 0 && (
          <div className="hidden md:flex w-full border-b border-border bg-white/90 backdrop-blur sticky top-0 z-40">
            <div className={cn(layout.maxWidth, 'mx-auto px-6 flex gap-1')}>
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                      isActive ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-slate-800',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}

        <main className={cn('flex-1 min-w-0 animate-fade-in', fullWidth ? '' : '')}>{children}</main>
      </div>

      {portal === 'public' && nav.length > 0 && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 glass-panel border-t z-50 flex justify-around py-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn('text-[10px] px-3 py-1 rounded-lg font-medium', isActive ? 'text-primary' : 'text-muted')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}

      <footer className="border-t border-border bg-white/80 py-3 text-center text-xs text-muted">
        WEREAL REOS · Design System v2.1 ·{' '}
        <Link to="/design-system" className="text-primary hover:underline">
          Style guide
        </Link>
      </footer>
    </div>
  );
}

export function PageHero({
  title,
  description,
  badge,
  actions,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border bg-white/70 backdrop-blur px-4 lg:px-8 py-6 lg:py-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          {badge}
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2 tracking-tight">{title}</h1>
          {description && <p className="text-muted mt-2 max-w-2xl text-sm lg:text-base">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function ContentArea({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-4 lg:p-8 pb-24 lg:pb-8', className)}>{children}</div>;
}

export function AIBanner() {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent/10 to-primary/5 border border-accent/20 px-4 py-3 text-sm">
      <Sparkles className="h-4 w-4 text-accent shrink-0" />
      <span className="text-slate-600">
        <strong className="text-slate-800">AI Guardrails active</strong> — không mutate giá/tồn kho/booking (FR-AI-03)
      </span>
    </div>
  );
}
