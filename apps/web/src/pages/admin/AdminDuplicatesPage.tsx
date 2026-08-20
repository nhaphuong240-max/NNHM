import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import {
  fetchListingDuplicates,
  resolveListingDuplicate,
  type DuplicateListingGroup,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

export function AdminDuplicatesPage() {
  const [groups, setGroups] = useState<DuplicateListingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchListingDuplicates();
      setGroups(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải duplicate queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleResolve(groupKey: string) {
    if (!window.confirm(`Reject duplicates và giữ primary cho ${groupKey}?`)) return;
    setBusy(groupKey);
    setError(null);
    try {
      const res = await resolveListingDuplicate(groupKey);
      setMessage(`Giữ ${res.data.primaryId} · rejected ${res.data.rejectedIds.join(', ') || '—'}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resolve thất bại');
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell
      title="Listing duplicates"
      subtitle="UC-LS-06 · SCR-ADMIN-009 · Detect · merge/reject"
      screenTag="Admin / Moderation"
    >
      <Link to="/admin/moderation" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Moderation queue
      </Link>

      {loading && <p style={{ color: brand.muted }}>Đang quét duplicates…</p>}
      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}
      {message && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#DCFCE7', color: brand.success }}>
          {message}
        </p>
      )}

      {!loading && groups.length === 0 && (
        <p className="text-sm rounded-xl p-6 text-center" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
          Không phát hiện nhóm trùng · BR-LS-05 chỉ listing published/active.
        </p>
      )}

      <div className="space-y-4">
        {groups.map((group) => (
          <section
            key={group.groupKey}
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-sm">{group.reason === 'SAME_UNIT' ? 'Trùng unit' : 'Title tương tự'}</p>
                <p className="text-xs font-mono mt-1" style={{ color: brand.muted }}>
                  {group.groupKey} · unit {group.unitId}
                </p>
              </div>
              <button
                type="button"
                disabled={busy === group.groupKey}
                onClick={() => void handleResolve(group.groupKey)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: brand.primary }}
              >
                Keep primary · reject others
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: brand.muted }}>
                  <th className="pb-2">Listing</th>
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Verified</th>
                </tr>
              </thead>
              <tbody>
                {group.listings.map((l) => (
                  <tr key={l.id} className="border-t" style={{ borderColor: brand.border }}>
                    <td className="py-2 font-mono text-xs">{l.id}</td>
                    <td className="py-2">{l.title}</td>
                    <td className="py-2">{l.status}</td>
                    <td className="py-2">{l.verified ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
