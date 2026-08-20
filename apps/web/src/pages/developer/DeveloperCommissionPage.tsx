import { FormEvent, useCallback, useEffect, useState } from 'react';
import { DeveloperShell } from '../../components/DeveloperShell';
import {
  closeCommissionDeal,
  createCommissionPolicy,
  downloadCommissionExport,
  fetchCommissionPolicies,
  fetchCommissionSnapshot,
  openCommissionHoldback,
  publishCommissionPolicy,
  type EntryRecord,
  type PolicyRecord,
  type SnapshotDetail,
} from '../../lib/api';
import { brand, formatVnd } from '../../theme/tokens';

const PROJECT_ID = 'prj_sunrise';

export function DeveloperCommissionPage() {
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [snapshot, setSnapshot] = useState<(SnapshotDetail & { entries: EntryRecord[] }) | null>(
    null,
  );
  const [bookingId, setBookingId] = useState('');
  const [policyName, setPolicyName] = useState('Sunrise co-broker v2');
  const [ratePercent, setRatePercent] = useState(2.5);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCommissionPolicies(PROJECT_ID);
      setPolicies(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải policy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  async function handleCreateDraft(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createCommissionPolicy({
        projectId: PROJECT_ID,
        name: policyName,
        ratePercent,
        splitRules: [
          { role: 'PRIMARY', recipientId: 'usr_agent_01', percent: 70 },
          { role: 'AGENCY', recipientId: 'agcy_sunrise', percent: 30 },
        ],
      });
      setMessage('Draft policy created');
      await loadPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(policyId: string) {
    setBusy(true);
    setError(null);
    try {
      await publishCommissionPolicy(policyId);
      setMessage(`Policy ${policyId} published (immutable)`);
      await loadPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseDeal() {
    if (!bookingId.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await closeCommissionDeal(bookingId.trim());
      setSnapshot(result);
      setMessage(`Snapshot ${result.data.id} · split ${result.meta?.splitTotalPercent ?? 100}%`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Close deal failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleHoldback() {
    if (!snapshot) return;
    setBusy(true);
    setError(null);
    try {
      await openCommissionHoldback(snapshot.data.id, {
        reason: 'Demo dispute — payout blocked',
      });
      setMessage('Holdback applied — payout blocked (UC-COM-04)');
      const refreshed = await fetchCommissionSnapshot(snapshot.data.id);
      setSnapshot({ ...refreshed, entries: refreshed.entries });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Holdback failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      const blob = await downloadCommissionExport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'commission-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeveloperShell
      title="Commission Policy"
      subtitle="Policy publish · deal snapshot · split 100% · holdback"
      screenTag="Developer / UC-COM-01 · S5-06"
    >
      <div className="space-y-6">
        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
        {message && (
          <div className="rounded-lg p-3 text-sm" style={{ background: '#DCFCE7', color: brand.success }}>
            {message}
          </div>
        )}

        <section
          className="rounded-xl p-4"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <h2 className="font-semibold mb-3">Policies — {PROJECT_ID}</h2>
          {loading ? (
            <p className="text-sm" style={{ color: brand.muted }}>
              Đang tải…
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: brand.muted }}>
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Ver</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Rate</th>
                    <th className="text-left py-2">Split</th>
                    <th className="text-left py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => (
                    <tr key={p.id} className="border-t" style={{ borderColor: brand.border }}>
                      <td className="py-2 font-mono text-xs">{p.id}</td>
                      <td className="py-2">v{p.attributes.version}</td>
                      <td className="py-2">{p.attributes.status}</td>
                      <td className="py-2">{p.attributes.ratePercent}%</td>
                      <td className="py-2">
                        {p.attributes.splitRules.map((r) => `${r.role} ${r.percent}%`).join(' · ')}
                      </td>
                      <td className="py-2">
                        {p.attributes.status === 'DRAFT' && (
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded-lg px-3 py-1 text-xs font-semibold text-white"
                            style={{ background: brand.primary }}
                            onClick={() => handlePublish(p.id)}
                          >
                            Publish
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section
          className="rounded-xl p-4 grid md:grid-cols-2 gap-6"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <form className="space-y-3" onSubmit={handleCreateDraft}>
            <h2 className="font-semibold">Tạo draft policy (S5-01)</h2>
            <label className="block text-sm">
              Tên
              <input
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                style={{ borderColor: brand.border }}
              />
            </label>
            <label className="block text-sm">
              Rate %
              <input
                type="number"
                step="0.1"
                value={ratePercent}
                onChange={(e) => setRatePercent(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                style={{ borderColor: brand.border }}
              />
            </label>
            <p className="text-xs" style={{ color: brand.muted }}>
              Split mặc định: PRIMARY 70% · AGENCY 30%
            </p>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: brand.primary }}
            >
              Tạo draft
            </button>
          </form>

          <div className="space-y-3">
            <h2 className="font-semibold">Chốt deal → snapshot (S5-02/03)</h2>
            <label className="block text-sm">
              Booking ID (DEPOSITED)
              <input
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="bk_..."
                className="mt-1 w-full rounded-xl border px-3 py-2 font-mono"
                style={{ borderColor: brand.border }}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !bookingId.trim()}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: brand.primary }}
                onClick={handleCloseDeal}
              >
                Close deal
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-xl px-4 py-2 text-sm font-semibold border"
                style={{ borderColor: brand.border }}
                onClick={handleExport}
              >
                Export CSV
              </button>
            </div>
          </div>
        </section>

        {snapshot && (
          <section
            className="rounded-xl p-4 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-semibold">Snapshot {snapshot.data.id}</h2>
              <span className="text-sm font-mono" style={{ color: brand.muted }}>
                hash {snapshot.data.attributes.policyHash.slice(0, 12)}…
              </span>
            </div>
            <p className="text-sm">
              Total commission:{' '}
              <strong>{formatVnd(snapshot.data.attributes.totalCommission)}</strong> · Status:{' '}
              {snapshot.data.attributes.status}
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: brand.muted }}>
                  <th className="text-left py-2">Role</th>
                  <th className="text-left py-2">Recipient</th>
                  <th className="text-left py-2">%</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Payout</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.entries.map((e) => (
                  <tr key={e.id} className="border-t" style={{ borderColor: brand.border }}>
                    <td className="py-2">{e.attributes.role}</td>
                    <td className="py-2 font-mono text-xs">{e.attributes.recipientId}</td>
                    <td className="py-2">{e.attributes.splitPercent}%</td>
                    <td className="py-2">{formatVnd(e.attributes.amount)}</td>
                    <td className="py-2">{e.attributes.payoutStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              disabled={busy}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: brand.warning }}
              onClick={handleHoldback}
            >
              Mở holdback (S5-04 demo)
            </button>
          </section>
        )}
      </div>
    </DeveloperShell>
  );
}
