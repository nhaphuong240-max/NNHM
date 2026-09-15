import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AdminShell } from '../../components/AdminShell';
import {
  fetchHomepageConfigAdmin,
  saveHomepageConfigAdmin,
  type HomepageConfigPayload,
  type HomepageTrendingItem,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

const EMPTY_TRENDING: HomepageTrendingItem = { label: '', intent: 'buy' };

export function AdminHomepagePage() {
  const [config, setConfig] = useState<HomepageConfigPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchHomepageConfigAdmin();
      setConfig(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!config) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const res = await saveHomepageConfigAdmin(config);
      setConfig(res.data);
      setSaved(`Đã lưu · ${new Date(res.meta.updatedAt).toLocaleString('vi-VN')}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setBusy(false);
    }
  }

  function updateTrending(index: number, patch: Partial<HomepageTrendingItem>) {
    if (!config) return;
    const trending = [...config.trending];
    trending[index] = { ...trending[index], ...patch };
    setConfig({ ...config, trending });
  }

  function addTrending() {
    if (!config) return;
    setConfig({ ...config, trending: [...config.trending, { ...EMPTY_TRENDING }] });
  }

  function removeTrending(index: number) {
    if (!config) return;
    setConfig({ ...config, trending: config.trending.filter((_, i) => i !== index) });
  }

  if (loading || !config) {
    return (
      <AdminShell title="Homepage CMS" subtitle="FR-CNT-004 · Quản lý trang chủ">
        <p style={{ color: brand.muted }}>{loading ? 'Đang tải…' : error}</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Homepage CMS" subtitle="FR-CNT-004 · Trending · dự án · rails trang chủ">
      <form onSubmit={handleSave} className="space-y-8 max-w-3xl">
        {error && (
          <p className="text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
            {error}
          </p>
        )}
        {saved && (
          <p className="text-sm rounded-lg p-3" style={{ background: brand.accentSoft, color: brand.primaryDark }}>
            {saved}
          </p>
        )}

        <section className="nnhn-card p-5 space-y-4">
          <h2 className="font-semibold">Trending searches</h2>
          {config.trending.map((row, i) => (
            <div key={i} className="grid sm:grid-cols-4 gap-2 items-end">
              <label className="text-xs block sm:col-span-2">
                Nhãn
                <input
                  value={row.label}
                  onChange={(e) => updateTrending(i, { label: e.target.value })}
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs block">
                Intent
                <select
                  value={row.intent ?? 'buy'}
                  onChange={(e) =>
                    updateTrending(i, { intent: e.target.value as HomepageTrendingItem['intent'] })
                  }
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                >
                  <option value="buy">buy</option>
                  <option value="rent">rent</option>
                  <option value="project">project</option>
                </select>
              </label>
              <label className="text-xs block">
                Quận / q
                <input
                  value={row.district ?? row.q ?? ''}
                  onChange={(e) => updateTrending(i, { district: e.target.value, q: e.target.value })}
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                />
              </label>
              <button type="button" className="text-xs text-red-600" onClick={() => removeTrending(i)}>
                Xóa
              </button>
            </div>
          ))}
          <button type="button" className="text-sm underline" onClick={addTrending}>
            + Thêm trending
          </button>
        </section>

        <section className="nnhn-card p-5 space-y-3">
          <h2 className="font-semibold">Dự án nổi bật (hero + rail)</h2>
          <p className="text-xs" style={{ color: brand.muted }}>
            Một dòng / projectId · developer · tagline · art (river|tower|bay)
          </p>
          <textarea
            rows={6}
            className="w-full rounded border px-3 py-2 text-sm font-mono"
            value={config.featuredProjects
              .map(
                (p) =>
                  `${p.projectId}\t${p.developer ?? ''}\t${p.tagline ?? ''}\t${p.art ?? 'tower'}`,
              )
              .join('\n')}
            onChange={(e) => {
              const featuredProjects = e.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line, sortOrder) => {
                  const [projectId, developer, tagline, art] = line.split('\t');
                  return {
                    projectId: projectId.trim(),
                    developer: developer?.trim(),
                    tagline: tagline?.trim(),
                    art: (art?.trim() as 'river' | 'tower' | 'bay') || 'tower',
                    sortOrder,
                  };
                });
              setConfig({ ...config, featuredProjects });
            }}
          />
        </section>

        <section className="nnhn-card p-5 space-y-3">
          <h2 className="font-semibold">Quick chips (PN / ngân sách)</h2>
          <textarea
            rows={4}
            className="w-full rounded border px-3 py-2 text-sm font-mono"
            value={config.quickChips
              .map((c) => {
                const parts = [c.label, c.intent ?? 'buy'];
                if (c.bedrooms != null) parts.push(`bedrooms=${c.bedrooms}`);
                if (c.maxPrice != null) parts.push(`maxPrice=${c.maxPrice}`);
                if (c.district) parts.push(`district=${c.district}`);
                return parts.join('\t');
              })
              .join('\n')}
            onChange={(e) => {
              const quickChips = e.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [label, intent, ...rest] = line.split('\t');
                  const chip: HomepageTrendingItem = {
                    label: label.trim(),
                    intent: (intent?.trim() as HomepageTrendingItem['intent']) || 'buy',
                  };
                  for (const part of rest) {
                    const [k, v] = part.split('=');
                    if (k === 'bedrooms') chip.bedrooms = Number(v);
                    if (k === 'maxPrice') chip.maxPrice = Number(v);
                    if (k === 'minPrice') chip.minPrice = Number(v);
                    if (k === 'district') chip.district = v;
                  }
                  return chip;
                });
              setConfig({ ...config, quickChips });
            }}
          />
        </section>

        <section className="nnhn-card p-5 space-y-3">
          <h2 className="font-semibold">Tin tức (JSON)</h2>
          <textarea
            rows={8}
            className="w-full rounded border px-3 py-2 text-sm font-mono"
            value={JSON.stringify(config.newsItems, null, 2)}
            onChange={(e) => {
              try {
                const newsItems = JSON.parse(e.target.value) as HomepageConfigPayload['newsItems'];
                setConfig({ ...config, newsItems });
              } catch {
                /* ignore while typing */
              }
            }}
          />
        </section>

        <section className="nnhn-card p-5 space-y-3">
          <h2 className="font-semibold">Sections · Map banner</h2>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {(Object.keys(config.sections) as (keyof HomepageConfigPayload['sections'])[]).map((key) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.sections[key]}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sections: { ...config.sections, [key]: e.target.checked },
                    })
                  }
                />
                {key}
              </label>
            ))}
          </div>
          <label className="block text-sm">
            Map title
            <input
              value={config.mapBanner.title}
              onChange={(e) =>
                setConfig({
                  ...config,
                  mapBanner: { ...config.mapBanner, title: e.target.value },
                })
              }
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Map subtitle
            <input
              value={config.mapBanner.subtitle}
              onChange={(e) =>
                setConfig({
                  ...config,
                  mapBanner: { ...config.mapBanner, subtitle: e.target.value },
                })
              }
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.mapBanner.enabled}
              onChange={(e) =>
                setConfig({
                  ...config,
                  mapBanner: { ...config.mapBanner, enabled: e.target.checked },
                })
              }
            />
            Hiện banner bản đồ
          </label>
          <label className="block text-sm">
            Số căn gợi ý (picksLimit)
            <input
              type="number"
              min={1}
              max={12}
              value={config.picksLimit}
              onChange={(e) => setConfig({ ...config, picksLimit: Number(e.target.value) })}
              className="mt-1 w-24 rounded border px-3 py-2 text-sm"
            />
          </label>
        </section>

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: brand.primary }}
        >
          {busy ? 'Đang lưu…' : 'Lưu homepage CMS'}
        </button>
      </form>
    </AdminShell>
  );
}
