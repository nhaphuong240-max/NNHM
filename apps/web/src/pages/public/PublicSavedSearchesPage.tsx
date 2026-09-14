import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicFooter } from '../../components/public/PublicFooter';
import { PublicTopBar } from '../../components/PublicTopBar';
import { usePageMeta } from '../../hooks/usePageMeta';
import { deleteSavedSearch, fetchSavedSearches, type SavedSearchRecord } from '../../lib/api';
import { getVisitorId } from '../../lib/visitor';
import { brand } from '../../theme/tokens';

export function PublicSavedSearchesPage() {
  const [rows, setRows] = useState<SavedSearchRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  usePageMeta({ title: 'Đã lưu / cảnh báo | Ngôi Nhà Hôm Nay' });

  async function load() {
    try {
      const res = await fetchSavedSearches(getVisitorId());
      setRows(res.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteSavedSearch(id, getVisitorId());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không xóa được');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col nnhn-paper">
      <PublicTopBar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 w-full">
        <p className="nnhn-kicker">FR-SRCH-003</p>
        <h1 className="nnhn-display text-4xl mt-2" style={{ color: brand.ink }}>
          Đã lưu
        </h1>
        <p className="text-sm mt-2" style={{ color: brand.muted }}>
          Cảnh báo listing mới bám theo consent. Chưa có tài khoản — tìm kiếm gắn với trình duyệt này.
        </p>
        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
        <ul className="mt-8 space-y-3">
          {rows.map((row) => {
            const href = `/public/search?intent=${encodeURIComponent(row.attributes.intent)}&q=${encodeURIComponent(row.attributes.q)}`;
            return (
              <li
                key={row.id}
                className="nnhn-card p-4 flex items-center justify-between gap-3"
                style={{ background: brand.surface }}
              >
                <div>
                  <Link to={href} className="font-semibold no-underline" style={{ color: brand.primaryDark }}>
                    {row.attributes.q || 'Mọi khu vực'} · {row.attributes.intent}
                  </Link>
                  <p className="text-xs mt-1" style={{ color: brand.muted }}>
                    Alert: {row.attributes.alertFrequency}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(row.id)}
                  className="text-xs font-semibold"
                  style={{ color: brand.clay }}
                >
                  Xóa
                </button>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 && !error && (
          <p className="text-sm mt-8" style={{ color: brand.muted }}>
            Chưa có tìm kiếm đã lưu.{' '}
            <Link to="/public/search" style={{ color: brand.primary }}>
              Tìm nhà
            </Link>
          </p>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
