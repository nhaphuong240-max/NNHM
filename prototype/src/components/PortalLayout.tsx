import { NavLink, Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';
import { Card, CardBody } from './ui/Card';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

interface PortalLayoutProps {
  portal: 'public' | 'agent' | 'admin';
  title: string;
  subtitle?: string;
  nav: NavItem[];
  userMenu?: string;
  children: React.ReactNode;
}

const portalColors = {
  public: 'bg-primary',
  agent: 'bg-slate-800',
  admin: 'bg-slate-900',
};

export function PortalLayout({ portal, title, subtitle, nav, userMenu, children }: PortalLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className={`${portalColors[portal]} text-white`}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg hover:opacity-80">
              <span className="bg-white/20 rounded px-2 py-0.5 text-sm">W</span>
              WEREAL
            </Link>
            <span className="text-white/60 hidden sm:inline">|</span>
            <span className="text-sm text-white/90 hidden sm:inline">{title}</span>
          </div>
          {userMenu && (
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-white/10 rounded-full px-3 py-1">{userMenu}</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {portal !== 'public' && (
          <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card shrink-0">
            <div className="p-4 border-b border-border">
              <Link to="/" className="flex items-center gap-1 text-xs text-muted hover:text-primary">
                <ArrowLeft className="h-3 w-3" /> Về Portal Hub
              </Link>
              {subtitle && <p className="text-xs text-muted mt-2">{subtitle}</p>}
            </div>
            <nav className="p-2 space-y-0.5 flex-1">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive ? 'bg-secondary text-primary' : 'text-muted hover:bg-secondary/50 hover:text-slate-900',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        )}

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {portal === 'public' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-50">
          {nav.slice(0, 4).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn('text-xs px-3 py-1 rounded', isActive ? 'text-primary font-medium' : 'text-muted')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  backTo,
  actions,
}: {
  title: string;
  description?: string;
  backTo?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          {backTo && (
            <Link to={backTo} className="text-sm text-muted hover:text-primary flex items-center gap-1 mb-1">
              <ArrowLeft className="h-3 w-3" /> Quay lại
            </Link>
          )}
          <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted mt-1">{description}</p>}
        </div>
        {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}

export function KPICard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'ring-2 ring-warning/30' : ''}>
      <CardBody className="text-center py-4">
        <p className="text-sm text-muted">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-warning' : 'text-primary'}`}>{value}</p>
      </CardBody>
    </Card>
  );
}
