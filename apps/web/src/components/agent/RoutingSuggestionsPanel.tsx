import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  approveRoutingSuggestion,
  fetchRoutingSuggestions,
  rejectRoutingSuggestion,
  type RoutingSuggestion,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

/** P2 FR-REV-002 — human approval before auto routing */
export function RoutingSuggestionsPanel() {
  const [items, setItems] = useState<RoutingSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRoutingSuggestions();
      setItems(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải suggestions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await approveRoutingSuggestion(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve thất bại');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      await rejectRoutingSuggestion(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject thất bại');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section
      className="rounded-xl p-5 space-y-3"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <p className="font-semibold">Routing suggestions (P2)</p>
      <p className="text-xs" style={{ color: brand.muted }}>
        Gợi ý theo partner score + aging tồn kho — cần duyệt trước khi assign.
      </p>
      {loading && <p className="text-sm" style={{ color: brand.muted }}>Đang tải…</p>}
      {error && (
        <p className="text-xs" style={{ color: brand.destructive }}>
          {error}
        </p>
      )}
      {!loading && items.length === 0 && (
        <p className="text-sm" style={{ color: brand.muted }}>
          Không có suggestion pending.
        </p>
      )}
      <ul className="space-y-2">
        {items.map((s) => (
          <li
            key={s.id}
            className="rounded-lg p-3 text-xs"
            style={{ background: brand.background, border: `1px solid ${brand.border}` }}
          >
            <div className="flex flex-wrap justify-between gap-2">
              <Link to={`/agent/leads/${s.leadId}`} className="font-bold underline" style={{ color: brand.primary }}>
                Lead {s.leadId}
              </Link>
              <span style={{ color: brand.muted }}>
                partner {s.partnerScore ?? '—'} · aging {s.inventoryAgingDays ?? 0}d
              </span>
            </div>
            <p className="mt-1">
              → {s.suggestedAgentEmail ?? s.suggestedAgentId}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={busyId === s.id}
                onClick={() => void handleApprove(s.id)}
                className="rounded px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                style={{ background: brand.primary }}
              >
                Duyệt
              </button>
              <button
                type="button"
                disabled={busyId === s.id}
                onClick={() => void handleReject(s.id)}
                className="rounded px-2 py-1 text-xs border disabled:opacity-50"
                style={{ borderColor: brand.border, color: brand.destructive }}
              >
                Từ chối
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
