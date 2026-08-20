import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import {
  fetchLegalCorpus,
  queryLegalRag,
  type LegalCorpusItem,
  type LegalRagHit,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

const SAMPLE_QUERIES = [
  'đặt cọc giữ chỗ',
  'hợp đồng mua bán',
  'PDPA bảo mật',
  'bàn giao căn hộ',
];

export function AgentAiLegalPage() {
  const [corpus, setCorpus] = useState<LegalCorpusItem[]>([]);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [hits, setHits] = useState<LegalRagHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCorpus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLegalCorpus();
      setCorpus(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được corpus pháp lý');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCorpus();
  }, [loadCorpus]);

  async function handleQuery(q?: string) {
    const text = (q ?? query).trim();
    if (!text) return;
    setQuery(text);
    setBusy(true);
    setError(null);
    try {
      const res = await queryLegalRag(text);
      setAnswer(res.data.answer);
      setHits(res.data.hits);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tra cứu pháp lý thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AgentShell
      title="Tra cứu pháp lý AI"
      subtitle="UC-AI-03 · SCR-AGENT-001 · Legal RAG pilot"
      screenTag="Agent / AI Legal"
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link to="/agent" className="underline" style={{ color: brand.primary }}>
          Agent hub
        </Link>
        <Link to="/developer/documents" className="underline" style={{ color: brand.muted }}>
          Document Vault
        </Link>
      </div>

      <section
        className="rounded-xl p-4 mb-6 space-y-3"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <p className="text-sm" style={{ color: brand.muted }}>
          Pilot keyword RAG trên seed chunks + thư mục LEGAL/CONTRACT trong Document Vault.
        </p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_QUERIES.map((sample) => (
            <button
              key={sample}
              type="button"
              disabled={busy}
              onClick={() => void handleQuery(sample)}
              className="rounded-full px-3 py-1 text-xs font-medium border disabled:opacity-50"
              style={{ borderColor: brand.border, color: brand.primaryDark }}
            >
              {sample}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleQuery()}
            placeholder="Câu hỏi pháp lý…"
            className="flex-1 min-w-[220px] rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: brand.border }}
          />
          <button
            type="button"
            disabled={busy || !query.trim()}
            onClick={() => void handleQuery()}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: brand.primary }}
          >
            {busy ? 'Đang tra…' : 'Tra cứu'}
          </button>
        </div>
      </section>

      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {answer && (
        <section
          className="rounded-xl p-4 mb-6 space-y-3"
          style={{ background: '#EFF6FF', border: `1px solid ${brand.primary}` }}
        >
          <h2 className="font-semibold text-sm">Kết quả</h2>
          <pre className="text-sm whitespace-pre-wrap font-sans" style={{ color: brand.primaryDark }}>
            {answer}
          </pre>
          {hits.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold uppercase" style={{ color: brand.muted }}>
                Trích dẫn ({hits.length})
              </p>
              {hits.map((hit) => (
                <article
                  key={hit.id}
                  className="rounded-lg p-3 text-sm"
                  style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{hit.title}</span>
                    <span className="text-xs font-mono" style={{ color: brand.muted }}>
                      score {hit.score}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: brand.muted }}>
                    {hit.source}
                  </p>
                  <p className="mt-2">{hit.snippet}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-3">Corpus đã index ({corpus.length})</h2>
        {loading ? (
          <p className="text-sm" style={{ color: brand.muted }}>
            Đang tải…
          </p>
        ) : corpus.length === 0 ? (
          <p className="text-sm" style={{ color: brand.muted }}>
            Chưa có chunk — upload LEGAL/CONTRACT vào Document Vault.
          </p>
        ) : (
          <ul className="space-y-2">
            {corpus.map((item) => (
              <li
                key={item.id}
                className="rounded-lg p-3 text-sm"
                style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
              >
                <p className="font-medium">{item.title}</p>
                <p className="text-xs mt-1" style={{ color: brand.muted }}>
                  {item.source} · {item.tags.join(', ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AgentShell>
  );
}
