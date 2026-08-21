import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchPublicBrand } from '../lib/api';
import { applyBrandTheme, FALLBACK_PUBLIC_BRAND, type PublicBrand } from '../lib/apply-brand-theme';
import { resolveTenantFromHost } from '../lib/tenant-host';
import { DEFAULT_TENANT_ID } from '../lib/constants';

const PublicBrandContext = createContext<PublicBrand | null>(null);

export function PublicBrandProvider({ children }: { children: ReactNode }) {
  const [publicBrand, setPublicBrand] = useState<PublicBrand | null>(null);

  useEffect(() => {
    let active = true;
    const hostTenant = resolveTenantFromHost(window.location.hostname);
    fetchPublicBrand(hostTenant ?? DEFAULT_TENANT_ID)
      .then((res) => {
        if (!active) return;
        const data: PublicBrand = {
          displayName: res.data.displayName,
          primaryColor: res.data.primaryColor,
          accentColor: res.data.accentColor,
          logoUrl: res.data.logoUrl,
          customDomain: res.data.customDomain,
          live: res.data.live,
        };
        setPublicBrand(data);
        applyBrandTheme(data);
      })
      .catch(() => {
        if (!active) return;
        setPublicBrand(FALLBACK_PUBLIC_BRAND);
        applyBrandTheme(FALLBACK_PUBLIC_BRAND);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => publicBrand, [publicBrand]);

  return <PublicBrandContext.Provider value={value}>{children}</PublicBrandContext.Provider>;
}

export function usePublicBrand() {
  return useContext(PublicBrandContext);
}
