import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import {
  createRegulatoryExportJob,
  downloadRegulatoryExportPack,
  fetchRegulatoryExportJobs,
  type RegulatoryExportJob,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

export function AdminRegulatoryExportPage() {
  const [jobs, setJobs] = useState<RegulatoryExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState<'AUDIT' | 'BOOKINGS' | 'FULL'>('FULL');
  const [legalTicket, setLegalTicket] = useState('LEGAL-2026-0729');
  const [downloadPreview, setDownloadPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRegulatoryExportJobs();
      setJobs(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải export jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    setDownloadPreview(null);
    try {
      const to = new Date();
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await createRegulatoryExportJob({
        scope,
        dateFrom: from.toISOString().slice(0, 10),
        dateTo: to.toISOString().slice(0, 10),
        legalTicketId: legalTicket.trim(),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo export job thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(jobId: string) {
    setError(null);
    try {
      const res = await downloadRegulatoryExportPack(jobId);
      setDownloadPreview(res.data.csv.slice(0, 400));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download thất bại');
    }
  }

  return (
    <AdminShell
      title="Regulatory Export Pack"
      subtitle="UC-TR-04 · SCR-ADMIN-018 · Compliance export"
      screenTag="Admin / Trust"
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link to="/admin/audit" className="underline" style={{ color: brand.primary }}>
          Audit explorer
        </Link>
        <Link to="/admin/disputes" className="underline" style={{ color: brand.muted }}>
          Disputes
        </Link>
      </div>

      {error && (
        <p className="text-sm rounded-lg p-3 mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      <section
        className="rounded-xl p-4 space-y-4 mb-6"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <h3 className="font-semibold text-sm">Export wizard (stub)</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs block mb-1">Scope</label>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
            >
              <option value="FULL">FULL — audit + bookings + payments</option>
              <option value="AUDIT">AUDIT only</option>
              <option value="BOOKINGS">BOOKINGS only</option>
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1">Legal ticket ID</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={legalTicket}
              onChange={(e) => setLegalTicket(e.target.value)}
            />
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: brand.primary }}
          onClick={() => void handleCreate()}
        >
          {busy ? 'Compiling…' : 'Compile encrypted pack'}
        </button>
        <p className="text-xs" style={{ color: brand.muted }}>
          Demo: manifest SHA-256 + CSV summary · download link 72h (BR-24)
        </p>
      </section>

      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải jobs…</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-xl p-4 flex flex-wrap justify-between gap-3"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <div>
                <p className="font-medium text-sm">{job.id}</p>
                <p className="text-xs mt-1" style={{ color: brand.muted }}>
                  {job.scope} · {job.status} · {job.fileCount} files
                </p>
                {job.manifestSha256 && (
                  <p className="text-xs mt-1 font-mono break-all">{job.manifestSha256.slice(0, 24)}…</p>
                )}
              </div>
              {job.status === 'READY' && (
                <button
                  type="button"
                  className="text-sm underline"
                  style={{ color: brand.primary }}
                  onClick={() => void handleDownload(job.id)}
                >
                  Download pack
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {downloadPreview && (
        <pre
          className="mt-4 text-xs p-3 rounded-lg overflow-x-auto"
          style={{ background: brand.background, border: `1px solid ${brand.border}` }}
        >
          {downloadPreview}
        </pre>
      )}
    </AdminShell>
  );
}
