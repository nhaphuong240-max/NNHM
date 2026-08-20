import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import { fetchInboxThreads, replyInboxThread, type InboxThread } from '../../lib/api';
import { brand } from '../../theme/tokens';

function ChannelBadge({ channel }: { channel: InboxThread['channel'] }) {
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">{channel}</span>
  );
}

export function AgentInboxPage() {
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchInboxThreads();
      setThreads(res.data);
      if (res.data.length > 0 && !selectedId) {
        setSelectedId(res.data[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải inbox');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = threads.find((t) => t.id === selectedId) ?? null;

  async function handleReply() {
    if (!selected || !replyMessage.trim()) return;
    setBusy(true);
    setError(null);
    setToast(null);
    try {
      const res = await replyInboxThread(selected.id, { message: replyMessage.trim(), channel: selected.channel });
      const { deliveryId, provider, status, channel } = res.data;
      setToast(
        `${channel} ${deliveryId} · ${provider} · ${status} → ${selected.leadName}`,
      );
      setReplyMessage('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gửi trả lời thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AgentShell
      title="Inbox đa kênh"
      subtitle="UC-CRM-07 · SCR-AGENT-007 · Zalo · Meta · SMS"
      screenTag="Agent / CRM Inbox"
    >
      <p
        className="text-sm rounded-lg p-3 mb-4"
        style={{ background: '#EFF6FF', color: brand.primaryDark, border: `1px solid ${brand.border}` }}
      >
        OPS-S4-03 · Inbox là nguồn lead chính (Zalo / web / Meta). Import CSV nằm ở Advanced →{' '}
        <Link to="/agent/leads/import" className="underline">
          Import CSV
        </Link>
        . Mở Inbox mỗi sáng — unread + kênh omni lên đầu.
      </p>
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link to="/agent/leads" className="underline" style={{ color: brand.primary }}>
          Leads
        </Link>
        <Link to="/agent/ai-reply" className="underline" style={{ color: brand.muted }}>
          AI Reply
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
        <p style={{ color: brand.muted }}>Đang tải inbox…</p>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-4">
          <aside className="space-y-2">
            <h2 className="font-semibold text-sm mb-2">Threads ({threads.length})</h2>
            {threads.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chưa có thread — kết nối Zalo/Meta integration.
              </p>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedId(thread.id)}
                  className="w-full text-left rounded-xl p-3 transition-colors"
                  style={{
                    background: selectedId === thread.id ? '#EFF6FF' : brand.surface,
                    border: `1px solid ${selectedId === thread.id ? brand.primary : brand.border}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{thread.leadName}</span>
                    {thread.unread && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: brand.primary }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <ChannelBadge channel={thread.channel} />
                    <span className="text-xs truncate" style={{ color: brand.muted }}>
                      {thread.preview}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: brand.muted }}>
                    {new Date(thread.lastMessageAt).toLocaleString('vi-VN')}
                  </p>
                </button>
              ))
            )}
          </aside>

          <section
            className="rounded-xl p-4 space-y-4 min-h-[320px]"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            {selected ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{selected.leadName}</h2>
                  <ChannelBadge channel={selected.channel} />
                  <span className="text-xs font-mono" style={{ color: brand.muted }}>
                    {selected.leadId}
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ background: '#F1F5F9', color: brand.muted }}
                  >
                    {selected.status}
                  </span>
                </div>
                <p className="text-sm rounded-lg p-3" style={{ background: brand.background }}>
                  {selected.preview}
                </p>
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: brand.border }}>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Nhập trả lời…"
                    rows={4}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: brand.border }}
                  />
                  <button
                    type="button"
                    disabled={busy || !replyMessage.trim()}
                    onClick={() => void handleReply()}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: brand.primary }}
                  >
                    {busy ? 'Đang gửi…' : 'Gửi trả lời'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chọn thread để trả lời.
              </p>
            )}
          </section>
        </div>
      )}
    </AgentShell>
  );
}
