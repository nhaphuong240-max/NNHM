import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { brand } from '../theme/tokens';

export type PortalNavLink = { to: string; label: string };

function NavItem({ to, label, onNavigate }: PortalNavLink & { onNavigate?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to.split('/').filter(Boolean).length <= 1}
      onClick={onNavigate}
      className={({ isActive }) =>
        `block rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? 'text-white' : 'nnhn-nav-idle opacity-90 hover:opacity-100'
        }`
      }
      style={({ isActive }) =>
        isActive
          ? { background: brand.primary, color: '#fff' }
          : { color: brand.ink, background: 'transparent' }
      }
    >
      {label}
    </NavLink>
  );
}

export function PortalNav({
  primary,
  advanced,
  trailing,
  stacked = false,
}: {
  primary: PortalNavLink[];
  advanced?: PortalNavLink[];
  trailing?: ReactNode;
  stacked?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (stacked) {
    return (
      <nav className="flex flex-col gap-1">
        {primary.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        {advanced && advanced.length > 0 ? (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${brand.border}` }}>
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: brand.muted }}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? 'Ẩn nâng cao' : 'Nâng cao'}
            </button>
            {open ? (
              <div className="mt-1 space-y-0.5 max-h-64 overflow-y-auto">
                {advanced.map((item) => (
                  <NavItem key={item.to} {...item} onNavigate={() => setOpen(false)} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {trailing ? <div className="mt-4 px-1">{trailing}</div> : null}
      </nav>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      {primary.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className="rounded-full px-3 py-1.5 font-medium"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
        >
          {item.label}
        </NavLink>
      ))}
      {advanced && advanced.length > 0 ? (
        <div className="relative">
          <button
            type="button"
            className="rounded-full px-3 py-1.5 font-medium"
            style={{ background: 'rgba(255,255,255,0.12)' }}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            Nâng cao
          </button>
          {open ? (
            <div
              className="absolute right-0 mt-2 z-20 min-w-[12rem] rounded-xl py-1"
              style={{
                background: brand.surface,
                border: `1px solid ${brand.border}`,
                color: brand.ink,
              }}
            >
              {advanced.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="block px-3 py-2 text-sm hover:bg-black/5"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {trailing}
    </div>
  );
}
