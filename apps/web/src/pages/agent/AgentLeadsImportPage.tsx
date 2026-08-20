import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import {
  commitLeadImport,
  previewLeadImport,
  type LeadImportPreviewRow,
  type LeadRecord,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

const SAMPLE_CSV = `fullName,phone,email,unitId,message
Nguyễn Thu Trang,+84901234567,trang@example.com,un_01,Walk-in showroom
Lê Văn B,+84909876543,,un_02,Referral agent
,0901234567,,,Missing name row`;

type Step = 'upload' | 'preview' | 'done';

export function AgentLeadsImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [csvText, setCsvText] = useState('');
  const [rows, setRows] = useState<LeadImportPreviewRow[]>([]);
  const [created, setCreated] = useState<LeadRecord[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [defaultSource, setDefaultSource] = useState('CSV_IMPORT');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validRows = useMemo(() => rows.filter((r) => r.valid), [rows]);
  const invalidRows = useMemo(() => rows.filter((r) => !r.valid), [rows]);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ''));
    };
    reader.readAsText(file);
  }, []);

  async function runPreview() {
    if (!csvText.trim()) {
      setError('Dán hoặc upload CSV trước.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await previewLeadImport(csvText);
      setRows(res.data.rows);
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function runCommit() {
    if (validRows.length === 0) {
      setError('Không có dòng hợp lệ để import.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await commitLeadImport({
        rows: validRows.map((r) => ({
          fullName: r.fullName,
          phone: r.phone,
          email: r.email,
          unitId: r.unitId,
          message: r.message,
        })),
        defaultSource,
        skipDuplicates,
      });
      setCreated(res.data);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AgentShell
      title="Import lead CSV"
      subtitle="UC-CRM-04 · SCR-AGENT-008 · Validate · dedupe phone"
      screenTag="Agent / CRM"
    >
      <Link to="/agent/pipeline" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Pipeline CRM
      </Link>

      <div className="flex gap-2 mb-6 text-xs">
        {(['upload', 'preview', 'done'] as Step[]).map((s, idx) => (
          <span
            key={s}
            className="rounded-full px-3 py-1 font-medium"
            style={{
              background: step === s ? brand.primary : brand.surface,
              color: step === s ? '#fff' : brand.muted,
              border: `1px solid ${brand.border}`,
            }}
          >
            {idx + 1}. {s === 'upload' ? 'Upload' : s === 'preview' ? 'Validate' : 'Done'}
          </span>
        ))}
      </div>

      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {step === 'upload' && (
        <div className="space-y-4">
          <div
            className="rounded-xl border-2 border-dashed p-8 text-center"
            style={{ borderColor: brand.border, background: brand.surface }}
          >
            <p className="text-sm mb-3">Kéo thả CSV hoặc chọn file · header: fullName, phone, email, unitId, message</p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
          <label className="block text-sm">
            Hoặc dán CSV
            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="mt-1 w-full font-mono text-xs rounded-lg border p-3"
              style={{ borderColor: brand.border }}
              placeholder={SAMPLE_CSV}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="text-sm underline"
              style={{ color: brand.primary }}
              onClick={() => setCsvText(SAMPLE_CSV)}
            >
              Dùng mẫu demo
            </button>
            <label className="text-sm flex items-center gap-2">
              Source
              <select
                value={defaultSource}
                onChange={(e) => setDefaultSource(e.target.value)}
                className="h-9 px-2 rounded-lg border text-sm"
                style={{ borderColor: brand.border }}
              >
                <option value="CSV_IMPORT">CSV_IMPORT</option>
                <option value="WALK_IN">WALK_IN</option>
              </select>
            </label>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
              />
              Bỏ qua SĐT trùng tenant
            </label>
          </div>
          <button
            type="button"
            disabled={busy || !csvText.trim()}
            onClick={() => void runPreview()}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: brand.primary }}
          >
            Validate preview
          </button>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <p className="text-sm">
            <strong>{validRows.length}</strong> hợp lệ · <strong>{invalidRows.length}</strong> lỗi / trùng
          </p>
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: brand.border }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ background: brand.surface, color: brand.muted }}>
                  <th className="p-3">#</th>
                  <th className="p-3">Họ tên</th>
                  <th className="p-3">SĐT</th>
                  <th className="p-3">Unit</th>
                  <th className="p-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t" style={{ borderColor: brand.border }}>
                    <td className="p-3">{row.rowNumber}</td>
                    <td className="p-3">{row.fullName || '—'}</td>
                    <td className="p-3 font-mono text-xs">{row.phone || '—'}</td>
                    <td className="p-3 font-mono text-xs">{row.unitId ?? '—'}</td>
                    <td className="p-3">
                      {row.valid ? (
                        <span style={{ color: brand.success }}>OK</span>
                      ) : (
                        <span style={{ color: brand.destructive }}>{row.errors.join('; ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-lg border px-4 py-2 text-sm"
              style={{ borderColor: brand.border }}
              onClick={() => setStep('upload')}
            >
              Quay lại
            </button>
            <button
              type="button"
              disabled={busy || validRows.length === 0}
              onClick={() => void runCommit()}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: brand.primary }}
            >
              Import {validRows.length} lead
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <p className="text-sm rounded-lg p-4" style={{ background: '#DCFCE7', color: brand.success }}>
            Đã tạo <strong>{created.length}</strong> lead · scoring async · hiển thị trên pipeline
          </p>
          <ul className="text-sm space-y-2">
            {created.map((lead) => (
              <li key={lead.id} className="font-mono text-xs">
                {lead.id} · {lead.attributes.fullName} · {lead.attributes.phone}
              </li>
            ))}
          </ul>
          <Link
            to="/agent/pipeline"
            className="inline-block rounded-lg px-5 py-2 text-sm font-semibold text-white"
            style={{ background: brand.primary }}
          >
            Mở pipeline
          </Link>
        </div>
      )}
    </AgentShell>
  );
}
