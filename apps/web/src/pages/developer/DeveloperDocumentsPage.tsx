import { FormEvent, useCallback, useEffect, useState } from 'react';
import { DeveloperShell } from '../../components/DeveloperShell';
import {
  downloadDocument,
  fetchDocumentAccessLog,
  fetchDocuments,
  uploadDocument,
  type DocumentAccessLogRecord,
  type DocumentRecord,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

const PROJECT_ID = 'prj_sunrise';

export function DeveloperDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [accessLogs, setAccessLogs] = useState<DocumentAccessLogRecord[]>([]);
  const [folder, setFolder] = useState<DocumentRecord['attributes']['folder']>('LEGAL');
  const [docType, setDocType] = useState('LEGAL_PACK');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDocuments({ entityType: 'PROJECT', entityId: PROJECT_ID });
      setDocuments(res.data);
      if (res.data[0] && !selectedId) setSelectedId(res.data[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải Document Vault');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadLogs = useCallback(async (documentId: string) => {
    try {
      const res = await fetchDocumentAccessLog(documentId);
      setAccessLogs(res.data);
    } catch {
      setAccessLogs([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId) void loadLogs(selectedId);
  }, [selectedId, loadLogs]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Chọn file trước khi upload');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await uploadDocument(file, {
        entityType: 'PROJECT',
        entityId: PROJECT_ID,
        folder,
        docType,
        retentionClass: '5Y',
      });
      setMessage(
        res.meta?.idempotentReplay
          ? `File trùng hash — dùng bản ${res.data.id}`
          : `Uploaded ${res.data.id}`,
      );
      setFile(null);
      await load();
      setSelectedId(res.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(doc: DocumentRecord) {
    setBusy(true);
    setError(null);
    try {
      const { watermark } = await downloadDocument(doc.id, doc.attributes.fileName);
      setMessage(watermark ? `Download OK · watermark: ${watermark}` : 'Download OK');
      await loadLogs(doc.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeveloperShell
      title="Document Vault"
      subtitle="UC-TR-02 · Local storage pilot · Access log BR-08"
      screenTag="Developer / Documents"
    >
      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải…</p>
      ) : (
        <div className="space-y-6">
          {error && (
            <p className="text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm rounded-lg p-3" style={{ background: '#ECFDF5', color: brand.success }}>
              {message}
            </p>
          )}

          <section
            className="rounded-xl p-5 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold">Upload — project {PROJECT_ID}</h2>
            <form onSubmit={(e) => void handleUpload(e)} className="grid sm:grid-cols-2 gap-3">
              <label className="text-xs" style={{ color: brand.muted }}>
                Folder
                <select
                  value={folder}
                  onChange={(e) => setFolder(e.target.value as DocumentRecord['attributes']['folder'])}
                  className="mt-1 w-full h-10 px-3 rounded-lg border text-sm"
                  style={{ borderColor: brand.border }}
                >
                  <option value="LEGAL">Legal</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label className="text-xs" style={{ color: brand.muted }}>
                Doc type
                <input
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border text-sm"
                  style={{ borderColor: brand.border }}
                />
              </label>
              <label className="text-xs sm:col-span-2" style={{ color: brand.muted }}>
                File (PDF/DOCX/TXT, max 10MB)
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-1 w-full text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={busy || !file}
                className="sm:col-span-2 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: brand.primary }}
              >
                Upload to local vault
              </button>
            </form>
            <p className="text-xs" style={{ color: brand.muted }}>
              Storage: local disk (`DOCUMENTS_STORAGE=local`) · S3 adapter stub sẵn sàng khi deploy MinIO
            </p>
          </section>

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold mb-3">Documents</h2>
            {documents.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chưa có tài liệu — seed `doc_seed_legal01` sau restart API
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 cursor-pointer"
                    style={{
                      background: selectedId === doc.id ? brand.background : undefined,
                      border: `1px solid ${brand.border}`,
                    }}
                    onClick={() => setSelectedId(doc.id)}
                  >
                    <div>
                      <p className="font-semibold">{doc.attributes.fileName}</p>
                      <p className="text-xs" style={{ color: brand.muted }}>
                        {doc.attributes.folder} · {doc.attributes.docType} · {doc.attributes.storageProvider} ·{' '}
                        {doc.attributes.scanStatus}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDownload(doc);
                      }}
                      className="text-xs font-semibold underline"
                      style={{ color: brand.primary }}
                    >
                      Download
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold mb-3">Access log {selectedId ? `· ${selectedId}` : ''}</h2>
            {accessLogs.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chọn document hoặc download để ghi log
              </p>
            ) : (
              <ul className="space-y-1 text-xs font-mono">
                {accessLogs.map((log) => (
                  <li key={log.id} className="flex flex-wrap gap-3 border-b pb-1" style={{ borderColor: brand.border }}>
                    <span>{log.attributes.action}</span>
                    <span>{log.attributes.actorId ?? '—'}</span>
                    <span>{new Date(log.attributes.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </DeveloperShell>
  );
}
