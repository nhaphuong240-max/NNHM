import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProjectSelect } from '../../components/developer/ProjectSelect';
import { DeveloperShell } from '../../components/DeveloperShell';
import { useProjectIdSelection } from '../../hooks/useDeveloperProjects';
import {
  commitUnitImport,
  previewUnitImport,
  type GrUnit,
  type UnitImportPreviewRow,
} from '../../lib/api';
import { brand, formatVnd } from '../../theme/tokens';

const SAMPLE_CSV = `code,floor,area,bedrooms,basePrice,status
A-12-05,12,68,2,3900000000,AVAILABLE
A-16-01,16,88,3,4800000000,AVAILABLE
B-10-03,10,60,2,3200000000,AVAILABLE
,10,60,2,3200000000,AVAILABLE
A-12-05,12,68,2,3850000000,AVAILABLE`;

type Step = 'upload' | 'preview' | 'done';

function DiffBadge({ action }: { action?: UnitImportPreviewRow['diffAction'] }) {
  if (!action) return null;
  const styles = {
    CREATE: { bg: '#DCFCE7', color: brand.success },
    UPDATE: { bg: '#FFEDD5', color: brand.warning },
    UNCHANGED: { bg: '#F1F5F9', color: brand.muted },
  }[action];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={styles}>
      {action}
    </span>
  );
}

export function DeveloperUnitImportPage() {
  const [searchParams] = useSearchParams();
  const { projectId, setProjectId } = useProjectIdSelection(searchParams.get('projectId'));

  const [step, setStep] = useState<Step>('upload');
  const [csvText, setCsvText] = useState('');
  const [rows, setRows] = useState<UnitImportPreviewRow[]>([]);
  const [meta, setMeta] = useState<{
    createCount: number;
    updateCount: number;
    unchangedCount: number;
    invalidCount: number;
  } | null>(null);
  const [result, setResult] = useState<{ created: GrUnit[]; updated: GrUnit[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commitRows = useMemo(
    () =>
      rows.filter(
        (r) => r.valid && (r.diffAction === 'CREATE' || r.diffAction === 'UPDATE'),
      ),
    [rows],
  );

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ''));
    reader.readAsText(file);
  }, []);

  async function runPreview() {
    if (!csvText.trim()) {
      setError('Dán hoặc upload CSV/Excel (export CSV) trước.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await previewUnitImport({ projectId, csvText });
      setRows(res.data.rows);
      setMeta({
        createCount: res.meta.createCount,
        updateCount: res.meta.updateCount,
        unchangedCount: res.meta.unchangedCount,
        invalidCount: res.meta.invalidCount,
      });
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function runCommit() {
    if (commitRows.length === 0) {
      setError('Không có dòng CREATE/UPDATE để commit.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await commitUnitImport({
        projectId,
        reason: 'Developer bulk import SCR-DEV-008',
        rows: commitRows.map((r) => ({
          code: r.code,
          floor: r.floor,
          area: r.area,
          bedrooms: r.bedrooms,
          basePrice: r.basePrice,
          status: r.status,
          diffAction: r.diffAction as 'CREATE' | 'UPDATE',
        })),
      });
      setResult(res.data);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeveloperShell
      title="Import bảng hàng"
      subtitle="UC-GR-06 · SCR-DEV-008 · Validate · preview diff · commit"
      screenTag="Developer / Golden Record"
    >
      <Link
        to={`/developer/units?projectId=${encodeURIComponent(projectId)}`}
        className="text-sm underline mb-4 inline-block"
        style={{ color: brand.primary }}
      >
        ← Bảng hàng GR
      </Link>
      <p
        className="text-sm rounded-lg p-3 mb-4"
        style={{ background: '#FFF7ED', color: brand.primaryDark, border: `1px solid ${brand.border}` }}
      >
        SOP tuần: import CSV bảng hàng — chỉ admin CĐT (`DEVELOPER_ADMIN`) PATCH giá. File:{' '}
        <code>docs/gtm/SOP-CDT-import-gia.md</code>
      </p>

      <div className="flex flex-wrap gap-3 items-center mb-6">
        <label className="text-sm">
          Dự án
          <ProjectSelect
            value={projectId}
            onChange={setProjectId}
            className="ml-2 rounded-lg border px-3 py-1.5 text-sm"
          />
        </label>
      </div>

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
            {idx + 1}. {s === 'upload' ? 'Upload' : s === 'preview' ? 'Preview diff' : 'Done'}
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
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <p className="text-sm mb-3" style={{ color: brand.muted }}>
              Template CSV: <code className="font-mono text-xs">code,floor,area,bedrooms,basePrice,status</code>
              · alias <code className="font-mono text-xs">ma_can,gia,dien_tich</code> · max 1000 rows.
            </p>
            <label className="block text-sm mb-3">
              Upload file
              <input
                type="file"
                accept=".csv,text/csv,.txt"
                className="mt-1 block text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={10}
              placeholder="Dán nội dung CSV…"
              className="w-full rounded-lg border p-3 font-mono text-xs"
              style={{ borderColor: brand.border }}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                className="text-xs underline"
                style={{ color: brand.primary }}
                onClick={() => setCsvText(SAMPLE_CSV)}
              >
                Dùng sample demo
              </button>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runPreview()}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: brand.primary }}
          >
            Validate & preview diff
          </button>
        </div>
      )}

      {step === 'preview' && meta && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'CREATE', value: meta.createCount, color: brand.success },
              { label: 'UPDATE', value: meta.updateCount, color: brand.warning },
              { label: 'UNCHANGED', value: meta.unchangedCount, color: brand.muted },
              { label: 'Invalid', value: meta.invalidCount, color: brand.destructive },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-xl p-3 text-center"
                style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
              >
                <p className="text-xs" style={{ color: brand.muted }}>
                  {k.label}
                </p>
                <p className="text-xl font-bold tabular-nums" style={{ color: k.color }}>
                  {k.value}
                </p>
              </div>
            ))}
          </div>

          <div
            className="rounded-xl overflow-x-auto"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <table className="w-full text-sm min-w-[720px]">
              <thead style={{ background: brand.background }}>
                <tr>
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Diff</th>
                  <th className="text-left p-2">Giá</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowNumber} className="border-t" style={{ borderColor: brand.border }}>
                    <td className="p-2 text-xs">{r.rowNumber}</td>
                    <td className="p-2 font-mono text-xs">{r.code || '—'}</td>
                    <td className="p-2">
                      <DiffBadge action={r.diffAction} />
                      {r.diffFields && r.diffFields.length > 0 && (
                        <p className="text-[10px] mt-0.5" style={{ color: brand.muted }}>
                          {r.diffFields.join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="p-2 text-xs tabular-nums">
                      {r.valid ? formatVnd(r.basePrice) : '—'}
                    </td>
                    <td className="p-2 text-xs">{r.status}</td>
                    <td className="p-2 text-xs" style={{ color: brand.destructive }}>
                      {r.errors.join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-lg border px-4 py-2 text-sm"
              style={{ borderColor: brand.border }}
              onClick={() => setStep('upload')}
            >
              ← Quay lại
            </button>
            <button
              type="button"
              disabled={busy || commitRows.length === 0}
              onClick={() => void runCommit()}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: brand.primary }}
            >
              Commit {commitRows.length} thay đổi
            </button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ background: '#DCFCE7', border: `1px solid ${brand.success}` }}
        >
          <p className="font-semibold" style={{ color: brand.success }}>
            Import hoàn tất
          </p>
          <p className="text-sm">
            Tạo mới <strong>{result.created.length}</strong> căn · Cập nhật{' '}
            <strong>{result.updated.length}</strong> căn.
          </p>
          <Link
            to={`/developer/units?projectId=${encodeURIComponent(projectId)}`}
            className="inline-block text-sm underline"
            style={{ color: brand.primaryDark }}
          >
            Xem bảng hàng GR →
          </Link>
        </div>
      )}
    </DeveloperShell>
  );
}
