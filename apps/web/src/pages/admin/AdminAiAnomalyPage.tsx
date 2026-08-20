import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import { DriftPanel } from '../../components/DriftPanel';
import {
  fetchAiAnomalies,
  resolveAiAnomaly,
  type AnomalyRecord,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

function severityColor(severity: string) {
  if (severity === 'CRITICAL') return brand.destructive;
  if (severity === 'HIGH') return brand.warning;
  if (severity === 'MEDIUM') return '#F59E0B';
  return brand.muted;
}

function statusBadge(status: string) {
  const color =
    status === 'OPEN' ? brand.warning : status === 'RESOLVED' ? brand.success : brand.muted;
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: color }}>
      {status}
    </span>
  );
}

export function AdminAiAnomalyPage() {
  const [items, setItems] = useState<AnomalyRecord[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AnomalyRecord | null>(null);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAiAnomalies();
      setItems(res.data);
      setOpenCount(res.meta.openCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được hàng đợi anomaly');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleResolve(anomalyId: string, action: 'RESOLVE' | 'DISMISS') {
    setBusyId(anomalyId);
    setError(null);
    try {
      await resolveAiAnomaly(anomalyId, { action, note: note.trim() || undefined });
      setToast(action === 'DISMISS' ? `Đã dismiss ${anomalyId}` : `Đã resolve ${anomalyId}`);
      setSelected(null);
      setNote('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thao tác thất bại');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell
      title="AI Anomaly queue"
      subtitle="UC-AI-05 · FR-AI-08 · SCR-ADMIN-002"
      screenTag="Admin / Ops Portal"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm" style={{ color: brand.muted }}>
          ML flag (rule stub): <strong>{openCount}</strong> mở / {items.length} tổng
        </p>
        <div className="flex gap-3 text-sm">
          <Link to="/admin/moderation" className="underline" style={{ color: brand.primary }}>
            Moderation
          </Link>
          <Link to="/admin/duplicates" className="underline" style={{ color: brand.primary }}>
            Duplicates
          </Link>
          <button type="button" className="underline" style={{ color: brand.primary }} onClick={() => void load()}>
            Làm mới
          </button>
        </div>
      </div>

      {toast && (
        <p
          className="text-sm rounded-lg p-3 mb-4"
          style={{ background: '#ECFDF5', color: brand.success }}
          onAnimationEnd={() => setToast(null)}
        >
          {toast}
        </p>
      )}

      {error && (
        <p className="text-sm rounded-lg p-3 mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {loading && <p style={{ color: brand.muted }}>Đang quét listing…</p>}

      {!loading && items.length === 0 && (
        <p className="text-sm" style={{ color: brand.muted }}>
          Không phát hiện anomaly — hàng đợi trống.
        </p>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full text-left rounded-xl p-4 hover:shadow-sm transition-shadow"
              style={{
                background: selected?.id === item.id ? '#F8FAFC' : brand.surface,
                border: `1px solid ${selected?.id === item.id ? brand.primary : brand.border}`,
              }}
              onClick={() => {
                setSelected(item);
                setNote('');
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: brand.muted }}>
                    {item.listingId} · unit {item.unitCode ?? item.unitId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded text-white"
                    style={{ background: severityColor(item.severity) }}
                  >
                    {item.severity} · {item.mlScore}
                  </span>
                  {statusBadge(item.queueStatus)}
                </div>
              </div>
              <ul className="mt-2 text-xs space-y-1" style={{ color: brand.muted }}>
                {item.signals.slice(0, 2).map((s) => (
                  <li key={s.code}>
                    {s.label}: {s.detail}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <aside
          className="rounded-xl p-4 h-fit sticky top-4"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          {!selected && (
            <p className="text-sm" style={{ color: brand.muted }}>
              Chọn một anomaly để investigate (UC-AI-05 bước 4).
            </p>
          )}

          {selected && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Investigate</h3>
                <p className="text-xs mt-1" style={{ color: brand.muted }}>
                  {selected.id}
                </p>
              </div>

              <DriftPanel
                report={{
                  status:
                    selected.severity === 'CRITICAL' || selected.severity === 'HIGH'
                      ? 'BLOCK'
                      : selected.severity === 'MEDIUM'
                        ? 'FLAG'
                        : 'PASS',
                  findings: selected.signals.map((s) => ({
                    field: s.code,
                    severity: s.severity === 'CRITICAL' ? 'BLOCK' : 'FLAG',
                    message: s.detail,
                  })),
                  unitCode: selected.unitCode,
                }}
              />

              <div>
                <p className="text-xs font-medium mb-2">Signals</p>
                <ul className="space-y-2">
                  {selected.signals.map((s) => (
                    <li
                      key={s.code}
                      className="text-xs rounded-lg p-2"
                      style={{ background: brand.background }}
                    >
                      <span className="font-semibold">{s.label}</span>
                      <p style={{ color: brand.muted }}>{s.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {selected.queueStatus === 'OPEN' && (
                <>
                  <div>
                    <label className="text-xs font-medium block mb-1">Ghi chú ops</label>
                    <textarea
                      className="w-full rounded-lg border px-3 py-2 text-sm min-h-[72px]"
                      style={{ borderColor: brand.border }}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Đã liên hệ agent / điều chỉnh giá…"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={busyId === selected.id}
                      className="rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-60"
                      style={{ background: brand.success }}
                      onClick={() => void handleResolve(selected.id, 'RESOLVE')}
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === selected.id}
                      className="rounded-lg py-2 text-sm font-semibold disabled:opacity-60"
                      style={{ border: `1px solid ${brand.border}` }}
                      onClick={() => void handleResolve(selected.id, 'DISMISS')}
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              )}

              {selected.queueStatus !== 'OPEN' && (
                <p className="text-sm" style={{ color: brand.muted }}>
                  {selected.queueStatus} · {selected.resolutionNote ?? '—'}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}
