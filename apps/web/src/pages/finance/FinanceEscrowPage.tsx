import { useCallback, useEffect, useState } from 'react';
import { FinanceShell } from '../../components/FinanceShell';
import {
  createEscrowAccount,
  fetchEscrowAccounts,
  releaseEscrowMilestone,
  type EscrowAccount,
} from '../../lib/api';
import { brand, finance, formatVnd } from '../../theme/tokens';

const DEFAULT_BOOKING_ID = 'bk_contract01';

function MilestoneStatusBadge({ status }: { status: EscrowAccount['milestones'][0]['status'] }) {
  const tone =
    status === 'RELEASED'
      ? { bg: '#DCFCE7', color: brand.success }
      : status === 'MET'
        ? { bg: '#EFF6FF', color: brand.primary }
        : { bg: '#FFEDD5', color: brand.warning };
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded" style={tone}>
      {status}
    </span>
  );
}

export function FinanceEscrowPage() {
  const [accounts, setAccounts] = useState<EscrowAccount[]>([]);
  const [bookingId, setBookingId] = useState(DEFAULT_BOOKING_ID);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEscrowAccounts();
      setAccounts(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải escrow accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    setBusyKey('create');
    setError(null);
    setToast(null);
    try {
      const res = await createEscrowAccount({ bookingId: bookingId.trim() || DEFAULT_BOOKING_ID });
      setToast(`Đã tạo escrow ${res.data.id} — UC-PAY-06`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo escrow thất bại');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRelease(accountId: string, milestoneId: string) {
    const key = `${accountId}:${milestoneId}`;
    setBusyKey(key);
    setError(null);
    setToast(null);
    try {
      await releaseEscrowMilestone(accountId, milestoneId);
      setToast(`Đã release milestone ${milestoneId}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Release milestone thất bại');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <FinanceShell
      title="Escrow milestones"
      subtitle="UC-PAY-06 · SCR-FIN-003 · Contract hold & release"
      screenTag="Finance / Escrow"
    >
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

      <section
        className="rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <label className="text-sm space-y-1 flex-1 min-w-[180px]">
          <span style={{ color: brand.muted }}>Booking ID</span>
          <input
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="block w-full rounded-lg border px-3 py-2 text-sm font-mono"
            style={{ borderColor: brand.border }}
          />
        </label>
        <button
          type="button"
          disabled={busyKey === 'create'}
          onClick={() => void handleCreate()}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: finance.accentDark }}
        >
          {busyKey === 'create' ? 'Đang tạo…' : 'Tạo escrow account'}
        </button>
        <button type="button" className="text-sm underline" style={{ color: brand.primary }} onClick={() => void load()}>
          Làm mới
        </button>
      </section>

      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải escrow…</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm" style={{ color: brand.muted }}>
          Chưa có escrow account — tạo với booking <code className="font-mono">{DEFAULT_BOOKING_ID}</code>.
        </p>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <article
              key={account.id}
              className="rounded-xl p-4 space-y-3"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold text-sm">{account.id}</span>
                <span className="text-xs font-mono" style={{ color: brand.muted }}>
                  {account.bookingId}
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{
                    background: account.status === 'COMPLETED' ? '#DCFCE7' : finance.accentSoft,
                    color: account.status === 'COMPLETED' ? brand.success : finance.accentDark,
                  }}
                >
                  {account.status}
                </span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs" style={{ color: brand.muted }}>
                    Tổng
                  </p>
                  <p className="font-bold tabular-nums">{formatVnd(account.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: brand.muted }}>
                    Đang giữ
                  </p>
                  <p className="font-bold tabular-nums">{formatVnd(account.heldAmount)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: brand.muted }}>
                    Đã release
                  </p>
                  <p className="font-bold tabular-nums">{formatVnd(account.releasedAmount)}</p>
                </div>
              </div>
              <ul className="space-y-2 pt-2 border-t" style={{ borderColor: brand.border }}>
                {account.milestones.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-sm"
                    style={{ background: brand.background }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.label}</span>
                        <MilestoneStatusBadge status={m.status} />
                      </div>
                      <p className="text-xs mt-1" style={{ color: brand.muted }}>
                        {m.condition} · {formatVnd(m.amount)}
                      </p>
                      {m.releasedAt && (
                        <p className="text-xs mt-1" style={{ color: brand.muted }}>
                          Released {new Date(m.releasedAt).toLocaleString('vi-VN')}
                        </p>
                      )}
                    </div>
                    {m.status !== 'RELEASED' && (
                      <button
                        type="button"
                        disabled={
                          busyKey === `${account.id}:${m.id}` ||
                          m.status !== 'MET'
                        }
                        onClick={() => void handleRelease(account.id, m.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        style={{ background: finance.accentDark }}
                        title={m.status === 'PENDING' ? 'Chưa đủ điều kiện (cần MET)' : undefined}
                      >
                        {busyKey === `${account.id}:${m.id}` ? '…' : 'Release'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </FinanceShell>
  );
}
