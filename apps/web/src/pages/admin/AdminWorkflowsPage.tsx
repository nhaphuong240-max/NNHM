import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import {
  fetchBookingWorkflow,
  publishBookingWorkflow,
  saveBookingWorkflow,
  type BookingWorkflowDefinition,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

export function AdminWorkflowsPage() {
  const [workflow, setWorkflow] = useState<BookingWorkflowDefinition | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBookingWorkflow();
      setWorkflow(res.data);
      setName(res.data.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải workflow');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveName() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    setToast(null);
    try {
      const res = await saveBookingWorkflow({ name: name.trim() });
      setWorkflow(res.data);
      setToast('Đã lưu workflow draft');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu workflow thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    setBusy(true);
    setError(null);
    setToast(null);
    try {
      const res = await publishBookingWorkflow();
      setWorkflow(res.data);
      setToast(`Đã publish v${res.data.version} — UC-BK-08`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish workflow thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="Booking workflow"
      subtitle="UC-BK-08 · SCR-ADMIN-023 · States & transitions"
      screenTag="Admin / Workflows"
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link to="/admin/booking-replay" className="underline" style={{ color: brand.primary }}>
          Booking replay
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
        <p style={{ color: brand.muted }}>Đang tải workflow…</p>
      ) : workflow ? (
        <div className="space-y-6">
          <section
            className="rounded-xl p-4 flex flex-wrap items-end gap-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm">
                <span style={{ color: brand.muted }}>Tên workflow</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: brand.border }}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{
                  background: workflow.status === 'PUBLISHED' ? '#DCFCE7' : '#FFEDD5',
                  color: workflow.status === 'PUBLISHED' ? brand.success : brand.warning,
                }}
              >
                {workflow.status} v{workflow.version}
              </span>
              {workflow.publishedAt && (
                <span className="text-xs" style={{ color: brand.muted }}>
                  {new Date(workflow.publishedAt).toLocaleString('vi-VN')}
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSaveName()}
              className="rounded-lg px-3 py-2 text-sm font-medium border disabled:opacity-50"
              style={{ borderColor: brand.border }}
            >
              Lưu draft
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handlePublish()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: brand.primary }}
            >
              {busy ? 'Đang publish…' : 'Publish workflow'}
            </button>
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            <section>
              <h2 className="font-semibold text-sm mb-3">States ({workflow.states.length})</h2>
              <ul className="space-y-2">
                {workflow.states.map((state) => (
                  <li
                    key={state.id}
                    className="rounded-lg p-3 text-sm flex items-center justify-between"
                    style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                  >
                    <div>
                      <span className="font-mono font-medium">{state.id}</span>
                      <span className="ml-2">{state.label}</span>
                    </div>
                    {state.terminal && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#F1F5F9' }}>
                        terminal
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-sm mb-3">Transitions ({workflow.transitions.length})</h2>
              <ul className="space-y-2">
                {workflow.transitions.map((tr, i) => (
                  <li
                    key={`${tr.from}-${tr.to}-${i}`}
                    className="rounded-lg p-3 text-sm"
                    style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                  >
                    <span className="font-mono">{tr.from}</span>
                    <span className="mx-2" style={{ color: brand.muted }}>
                      →
                    </span>
                    <span className="font-mono">{tr.to}</span>
                    <p className="text-xs mt-1" style={{ color: brand.muted }}>
                      {tr.label}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
