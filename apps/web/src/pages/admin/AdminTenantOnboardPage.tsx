import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import { createTenant, type TenantRecord } from '../../lib/api';
import { fetchPublicTenants, type TenantOption } from '../../lib/auth';
import { brand } from '../../theme/tokens';

const TENANT_TYPES = [
  { value: 'DEVELOPER', label: 'Developer (Chủ đầu tư)' },
  { value: 'AGENCY', label: 'Agency (Môi giới)' },
  { value: 'PLATFORM', label: 'Platform Ops' },
] as const;

const DEFAULT_MODULES = [
  { id: 'gr', label: 'Golden Record', enabled: true },
  { id: 'crm', label: 'CRM & Leads', enabled: true },
  { id: 'ls', label: 'Listing & Search', enabled: true },
  { id: 'pay', label: 'Payment & Ledger', enabled: false },
  { id: 'com', label: 'Commission', enabled: false },
] as const;

function StepIndicator({ step }: { step: number }) {
  const labels = ['Thông tin tenant', 'Modules & RBAC', 'Hoàn tất'];
  return (
    <ol className="flex flex-wrap gap-2 mb-8">
      {labels.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <li
            key={label}
            className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: active ? '#334155' : done ? '#DCFCE7' : brand.surface,
              color: active ? '#fff' : done ? brand.success : brand.muted,
              border: `1px solid ${active ? '#334155' : brand.border}`,
            }}
          >
            <span className="font-bold">{n}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

export function AdminTenantOnboardPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof TENANT_TYPES)[number]['value']>('DEVELOPER');
  const [slug, setSlug] = useState('');
  const [created, setCreated] = useState<TenantRecord | null>(null);
  const [existing, setExisting] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicTenants()
      .then(setExisting)
      .catch(() => setExisting([]));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên tenant');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await createTenant({
        name: name.trim(),
        type,
        slug: slug.trim() || undefined,
      });
      setCreated(res.data);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo tenant thất bại');
    } finally {
      setLoading(false);
    }
  }, [name, slug, type]);

  function resetWizard() {
    setStep(1);
    setName('');
    setSlug('');
    setCreated(null);
    setError(null);
    fetchPublicTenants().then(setExisting).catch(() => undefined);
  }

  return (
    <AdminShell
      title="Onboard tenant"
      subtitle="UC-ID-01 · SCR-ADMIN-019 · RLS + default RBAC"
      screenTag="Admin / Identity"
    >
      <StepIndicator step={step} />

      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {step === 1 && (
        <section
          className="rounded-xl p-6 max-w-lg space-y-4"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <h2 className="font-semibold">Bước 1 — Thông tin tenant</h2>
          <label className="block text-sm">
            <span className="font-medium">Tên tổ chức</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vinhomes Pilot Agency"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              style={{ borderColor: brand.border }}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Loại tenant</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as (typeof TENANT_TYPES)[number]['value'])}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              style={{ borderColor: brand.border }}
            >
              {TENANT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Slug (tuỳ chọn)</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="vinhomes-agency"
              className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
              style={{ borderColor: brand.border }}
            />
            <span className="text-xs mt-1 block" style={{ color: brand.muted }}>
              ID tenant: ten_{slug.trim() || 'auto-from-name'}
            </span>
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleCreate()}
            className="rounded-xl px-4 py-2.5 font-semibold text-white disabled:opacity-50"
            style={{ background: '#334155' }}
          >
            {loading ? 'Đang tạo…' : 'Tạo tenant →'}
          </button>
        </section>
      )}

      {step === 2 && created && (
        <section className="space-y-6 max-w-2xl">
          <div
            className="rounded-xl p-5"
            style={{ background: '#ECFDF5', border: `1px solid ${brand.success}` }}
          >
            <p className="font-semibold" style={{ color: brand.success }}>
              Tenant đã tạo: {created.id}
            </p>
            <p className="text-sm mt-1">
              {created.attributes.name} · {created.attributes.type} ·{' '}
              {created.attributes.isActive ? 'ACTIVE' : 'INACTIVE'}
            </p>
          </div>

          <div
            className="rounded-xl p-6 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold">Bước 2 — Modules mặc định (pilot)</h2>
            <p className="text-sm" style={{ color: brand.muted }}>
              RBAC seed và invite admin user sẽ có ở S2. Hiện tenant được kích hoạt ngay với module cơ bản.
            </p>
            <ul className="space-y-2">
              {DEFAULT_MODULES.map((m) => (
                <li key={m.id} className="flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={m.enabled} readOnly disabled />
                  <span>{m.label}</span>
                  {!m.enabled && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">S2</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-xl px-4 py-2.5 font-semibold text-white"
              style={{ background: '#334155' }}
            >
              Kích hoạt & hoàn tất →
            </button>
            <Link to="/admin/users" className="rounded-xl px-4 py-2.5 font-medium underline" style={{ color: brand.primary }}>
              Quản lý user
            </Link>
          </div>
        </section>
      )}

      {step === 3 && created && (
        <section
          className="rounded-xl p-6 max-w-lg space-y-4 text-center"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <h2 className="text-xl font-bold" style={{ color: brand.success }}>
            Onboard hoàn tất
          </h2>
          <p className="text-sm" style={{ color: brand.muted }}>
            Tenant <strong className="font-mono">{created.id}</strong> đã sẵn sàng. User admin có thể đăng nhập sau
            khi được invite (S2).
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={resetWizard}
              className="rounded-xl px-4 py-2 font-medium"
              style={{ border: `1px solid ${brand.border}` }}
            >
              Onboard tenant khác
            </button>
            <Link
              to="/admin/users"
              className="rounded-xl px-4 py-2 font-semibold text-white"
              style={{ background: brand.primary }}
            >
              Mở quản lý user
            </Link>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h3 className="font-semibold mb-3">Tenants hiện có</h3>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <table className="w-full text-sm">
            <thead style={{ background: brand.background }}>
              <tr>
                <th className="text-left p-3 font-medium">ID</th>
                <th className="text-left p-3 font-medium">Tên</th>
                <th className="text-left p-3 font-medium">Loại</th>
                <th className="text-left p-3 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {existing.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center" style={{ color: brand.muted }}>
                    Chưa có tenant
                  </td>
                </tr>
              ) : (
                existing.map((t) => (
                  <tr key={t.id} className="border-t" style={{ borderColor: brand.border }}>
                    <td className="p-3 font-mono">{t.id}</td>
                    <td className="p-3">{t.attributes.name}</td>
                    <td className="p-3">{t.attributes.type}</td>
                    <td className="p-3">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded text-white"
                        style={{ background: t.attributes.isActive ? brand.success : brand.muted }}
                      >
                        {t.attributes.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
