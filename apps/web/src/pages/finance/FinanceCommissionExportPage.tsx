import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FinanceShell } from '../../components/FinanceShell';
import {
  createCommissionExportJob,
  downloadCommissionExport,
  downloadCommissionExportJob,
  fetchCommissionExportJob,
} from '../../lib/api';
import { brand, finance } from '../../theme/tokens';

const EXPORT_COLUMNS = [
  'entry_id',
  'snapshot_id',
  'booking_id',
  'recipient_type',
  'recipient_id',
  'role',
  'split_percent',
  'amount',
  'payout_status',
  'created_at',
];

const HISTORY_KEY = 'wereal_commission_export_history';

type ExportHistoryRow = {
  id: string;
  dateFrom: string;
  dateTo: string;
  downloadedAt: string;
};

function loadHistory(): ExportHistoryRow[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ExportHistoryRow[];
  } catch {
    return [];
  }
}

function saveHistory(row: ExportHistoryRow) {
  const prev = loadHistory();
  localStorage.setItem(HISTORY_KEY, JSON.stringify([row, ...prev].slice(0, 20)));
}

function monthPreset(offsetMonths: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  const from = d.toISOString().slice(0, 10);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from, to: end.toISOString().slice(0, 10) };
}

export function FinanceCommissionExportPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeHoldbackNote, setIncludeHoldbackNote] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<ExportHistoryRow[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleExport = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    setJobId(null);
    setJobStatus(null);
    try {
      const jobRes = await createCommissionExportJob({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setJobId(jobRes.data.id);
      setJobStatus(jobRes.data.status);

      let ready = jobRes.data.status === 'READY';
      let attempts = 0;
      while (!ready && attempts < 10) {
        await new Promise((r) => setTimeout(r, 300));
        const poll = await fetchCommissionExportJob(jobRes.data.id);
        setJobStatus(poll.data.status);
        ready = poll.data.status === 'READY';
        attempts += 1;
      }

      const blob = await downloadCommissionExportJob(jobRes.data.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `commission-export${dateFrom ? `-${dateFrom}` : ''}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      const row: ExportHistoryRow = {
        id: jobRes.data.id,
        dateFrom: dateFrom || '(all)',
        dateTo: dateTo || '(all)',
        downloadedAt: new Date().toISOString(),
      };
      saveHistory(row);
      setHistory(loadHistory());
      setMessage(`Đã tải CSV từ job ${jobRes.data.id} (UC-COM-05 · async audit queue)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export thất bại');
    } finally {
      setBusy(false);
    }
  }, [dateFrom, dateTo]);

  const handleSyncExport = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const blob = await downloadCommissionExport(dateFrom || undefined, dateTo || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `commission-export${dateFrom ? `-${dateFrom}` : ''}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Đã tải CSV sync (legacy endpoint)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export thất bại');
    } finally {
      setBusy(false);
    }
  }, [dateFrom, dateTo]);

  return (
    <FinanceShell
      title="Export hoa hồng kế toán"
      subtitle="UC-COM-05 · SCR-FIN-001 · CSV audit checksum pilot"
      screenTag="Finance / Commission"
    >
      <Link
        to="/finance/reconciliation"
        className="text-sm underline mb-4 inline-block"
        style={{ color: finance.accentDark }}
      >
        ← Finance dashboard
      </Link>

      <div className="grid lg:grid-cols-[1fr_280px] gap-8">
        <section
          className="rounded-xl p-5 space-y-5"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <h2 className="font-semibold">Tạo export</h2>

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Tháng này', ...monthPreset(0) },
              { label: 'Tháng trước', ...monthPreset(-1) },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="text-xs rounded-lg px-3 py-1.5 border"
                style={{ borderColor: brand.border }}
                onClick={() => {
                  setDateFrom(preset.from);
                  setDateTo(preset.to);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="text-sm space-y-1">
              <span style={{ color: brand.muted }}>Từ ngày</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="block h-9 px-3 rounded-lg border text-sm"
                style={{ borderColor: brand.border }}
              />
            </label>
            <label className="text-sm space-y-1">
              <span style={{ color: brand.muted }}>Đến ngày</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="block h-9 px-3 rounded-lg border text-sm"
                style={{ borderColor: brand.border }}
              />
            </label>
          </div>

          <fieldset className="text-sm space-y-2">
            <legend className="font-medium mb-1">Định dạng</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="format" defaultChecked />
              CSV (pilot)
            </label>
            <label className="flex items-center gap-2 opacity-50">
              <input type="radio" name="format" disabled />
              XLSX — Phase 2
            </label>
          </fieldset>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeHoldbackNote}
              onChange={(e) => setIncludeHoldbackNote(e.target.checked)}
              className="mt-1"
            />
            <span>
              Ghi chú dòng HOLDBACK trong export
              {!includeHoldbackNote && (
                <span className="block text-xs mt-1" style={{ color: brand.muted }}>
                  CSV hiện gồm mọi payout_status — filter Phase 2
                </span>
              )}
            </span>
          </label>

          {message && (
            <p className="text-sm rounded-lg p-3" style={{ background: '#DCFCE7', color: brand.success }}>
              {message}
            </p>
          )}
          {error && (
            <p className="text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
              {error}
            </p>
          )}

          {jobId && (
            <p className="text-xs font-mono" style={{ color: brand.muted }}>
              Job {jobId} · {jobStatus ?? '—'}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleExport()}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: finance.accentDark }}
            >
              {busy ? 'Đang tạo job…' : 'Tải CSV (async job)'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSyncExport()}
              className="rounded-lg px-4 py-2.5 text-sm border disabled:opacity-50"
              style={{ borderColor: brand.border }}
            >
              Sync legacy
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <section
            className="rounded-xl p-4"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold text-sm mb-3">Cột export</h3>
            <ul className="text-xs font-mono space-y-1" style={{ color: brand.muted }}>
              {EXPORT_COLUMNS.map((col) => (
                <li key={col}>{col}</li>
              ))}
            </ul>
          </section>

          <section
            className="rounded-xl p-4"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold text-sm mb-3">Lịch sử tải (local)</h3>
            {history.length === 0 ? (
              <p className="text-xs" style={{ color: brand.muted }}>
                Chưa có export. Seed demo: cs_settle01 · ce_settle01/02
              </p>
            ) : (
              <ul className="text-xs space-y-2">
                {history.map((row) => (
                  <li key={row.id} className="border-b pb-2" style={{ borderColor: brand.border }}>
                    <p>
                      {row.dateFrom} → {row.dateTo}
                    </p>
                    <p style={{ color: brand.muted }}>
                      {new Date(row.downloadedAt).toLocaleString('vi-VN')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </FinanceShell>
  );
}
