import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import { fetchTenantBrand, updateTenantBrand, type TenantBrandConfig } from '../../lib/api';
import { brand } from '../../theme/tokens';

const URL_PACK_PUBLIC = [
  { path: '/public/search', label: 'Tìm căn (public)' },
  { path: '/public/map', label: 'Bản đồ' },
  { path: '/public/compare', label: 'So sánh' },
  { path: '/public/units/tl_un_01', label: 'Chi tiết căn mẫu' },
  {
    path: '/buyer/esign?contractId=ctr_pilot_deposit01&tenantId=ten_pilot_cdt_01',
    label: 'Ký phiếu cọc pilot',
  },
];

const URL_PACK_DEV = [
  { path: '/developer/units', label: 'GR — danh sách căn' },
  { path: '/developer/units/import', label: 'Import GR' },
  { path: '/developer/commission', label: 'Chính sách HH' },
  { path: '/developer/absorption', label: 'Absorption' },
  { path: '/admin/whitelabel', label: 'Whitelabel (trang này)' },
];

export function AdminWhitelabelPage() {
  const [config, setConfig] = useState<TenantBrandConfig | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [primaryColor, setPrimaryColor] = useState<string>(brand.primary);
  const [accentColor, setAccentColor] = useState<string>('#0EA5E9');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTenantBrand();
      setConfig(res.data);
      setDisplayName(res.data.displayName);
      setSubdomain(res.data.subdomain);
      setCustomDomain(res.data.customDomain ?? '');
      setPrimaryColor(res.data.primaryColor);
      setAccentColor(res.data.accentColor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải brand config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setToast(null);
    try {
      const res = await updateTenantBrand({
        displayName: displayName.trim(),
        subdomain: subdomain.trim(),
        customDomain: customDomain.trim() || undefined,
        primaryColor,
        accentColor,
      });
      setConfig(res.data);
      setToast('Đã cập nhật whitelabel — UC-UX-05');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cập nhật brand thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="Whitelabel branding"
      subtitle="UC-UX-05 · OPS-S6-02 · Tenant subdomain, custom domain & colors"
      screenTag="Admin / Branding"
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link to="/admin" className="underline" style={{ color: brand.primary }}>
          Admin hub
        </Link>
        <button type="button" className="underline" onClick={() => void load()}>
          Làm mới
        </button>
      </div>

      {toast && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#ECFDF5', color: brand.success }}>
          {toast}
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải brand config…</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleSave}
            className="rounded-xl p-4 space-y-4"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold text-sm">Cấu hình brand</h2>
            <label className="block text-sm">
              <span style={{ color: brand.muted }}>Tên hiển thị</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: brand.border }}
              />
            </label>
            <label className="block text-sm">
              <span style={{ color: brand.muted }}>Subdomain</span>
              <input
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="sunrise"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                style={{ borderColor: brand.border }}
              />
              <p className="text-xs mt-1" style={{ color: brand.muted }}>
                {subdomain || 'tenant'}.wereal.vn
              </p>
            </label>
            <label className="block text-sm">
              <span style={{ color: brand.muted }}>Custom domain (ENTERPRISE)</span>
              <input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="portal.thanglong-dev.vn"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                style={{ borderColor: brand.border }}
              />
              <p className="text-xs mt-1" style={{ color: brand.muted }}>
                DNS CNAME → staging ingress · docs/gtm/whitelabel-url-pack-ops90.md
              </p>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span style={{ color: brand.muted }}>Primary color</span>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 w-12 rounded border cursor-pointer"
                    style={{ borderColor: brand.border }}
                  />
                  <input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 rounded-lg border px-2 py-1 text-sm font-mono"
                    style={{ borderColor: brand.border }}
                  />
                </div>
              </label>
              <label className="block text-sm">
                <span style={{ color: brand.muted }}>Accent color</span>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-9 w-12 rounded border cursor-pointer"
                    style={{ borderColor: brand.border }}
                  />
                  <input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 rounded-lg border px-2 py-1 text-sm font-mono"
                    style={{ borderColor: brand.border }}
                  />
                </div>
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: brand.primary }}
            >
              {busy ? 'Đang lưu…' : 'Lưu brand'}
            </button>
            {config && (
              <p className="text-xs" style={{ color: brand.muted }}>
                Cập nhật lần cuối: {new Date(config.updatedAt).toLocaleString('vi-VN')}
                {config.live ? ' · LIVE' : ' · DRAFT'}
              </p>
            )}
          </form>

          <section
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${brand.border}` }}
          >
            <div className="text-white px-4 py-3" style={{ background: primaryColor }}>
              <p className="text-xs opacity-80">Preview header</p>
              <h2 className="text-lg font-bold">{displayName || 'Tenant Name'}</h2>
              <p className="text-sm opacity-90">
                {customDomain || `${subdomain || 'subdomain'}.wereal.vn`}
              </p>
            </div>
            <div className="p-4 space-y-3" style={{ background: brand.surface }}>
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ background: primaryColor }}
              >
                Nút primary
              </button>
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white ml-2"
                style={{ background: accentColor }}
              >
                Nút accent
              </button>
              <p className="text-sm" style={{ color: brand.muted }}>
                Panel preview whitelabel — màu sẽ áp dụng cho portal tenant.
              </p>
            </div>
          </section>

          <section
            className="rounded-xl p-4 space-y-3 text-sm"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold">OPS-S6 URL pack (5+5)</h2>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: brand.muted }}>
                Public (khách)
              </p>
              <ul className="space-y-1">
                {URL_PACK_PUBLIC.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="underline font-mono text-xs" style={{ color: brand.primary }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: brand.muted }}>
                Dev / CĐT
              </p>
              <ul className="space-y-1">
                {URL_PACK_DEV.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="underline font-mono text-xs" style={{ color: brand.primary }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
