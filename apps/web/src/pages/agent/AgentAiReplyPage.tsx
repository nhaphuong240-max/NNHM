import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import { draftAiReply, sendAiReply, type AiReplyDraft } from '../../lib/api';
import { brand } from '../../theme/tokens';

const TONE_OPTIONS: { value: AiReplyDraft['tone']; label: string }[] = [
  { value: 'formal', label: 'Trang trọng' },
  { value: 'friendly', label: 'Thân thiện' },
  { value: 'concise', label: 'Ngắn gọn' },
];

export function AgentAiReplyPage() {
  const [inboundMessage, setInboundMessage] = useState('');
  const [tone, setTone] = useState<AiReplyDraft['tone']>('friendly');
  const [draft, setDraft] = useState<AiReplyDraft | null>(null);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [leadId, setLeadId] = useState('ld_01');
  const [draftSource, setDraftSource] = useState<string | null>(null);

  async function handleDraft() {
    const text = inboundMessage.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    setToast(null);
    try {
      const res = await draftAiReply({ inboundMessage: text, tone, leadId: leadId.trim() || undefined });
      setDraft(res.data);
      setDraftSource(res.data.source ?? res.meta?.source ?? 'template');
      setReplyText(res.data.replyText);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo draft thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    if (!draft || !replyText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await sendAiReply({
        draftId: draft.draftId,
        replyText: replyText.trim(),
        leadId: leadId.trim() || undefined,
        channel: 'ZALO',
      });
      setToast('Đã gửi phản hồi AI — UC-AI-04');
      setDraft(null);
      setReplyText('');
      setInboundMessage('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gửi phản hồi thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AgentShell
      title="AI trả lời khách"
      subtitle="UC-AI-04 · SCR-AGENT-002 · Draft & approve send"
      screenTag="Agent / AI Reply"
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link to="/agent" className="underline" style={{ color: brand.primary }}>
          Agent hub
        </Link>
        <Link to="/agent/inbox" className="underline" style={{ color: brand.muted }}>
          Inbox CRM
        </Link>
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

      <section
        className="rounded-xl p-4 mb-6 space-y-3"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <h2 className="font-semibold text-sm">Tin nhắn đến</h2>
        <label className="block text-sm">
          <span style={{ color: brand.muted }}>Lead ID (gửi qua inbox)</span>
          <input
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            className="mt-1 w-full max-w-xs rounded-lg border px-3 py-2 text-sm font-mono"
            style={{ borderColor: brand.border }}
          />
        </label>
        <textarea
          value={inboundMessage}
          onChange={(e) => setInboundMessage(e.target.value)}
          placeholder="Dán tin nhắn khách hàng…"
          rows={4}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: brand.border }}
        />
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm space-y-1">
            <span style={{ color: brand.muted }}>Giọng điệu</span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as AiReplyDraft['tone'])}
              className="block rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: brand.border }}
            >
              {TONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy || !inboundMessage.trim()}
            onClick={() => void handleDraft()}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: brand.primary }}
          >
            {busy && !draft ? 'Đang tạo draft…' : 'Tạo draft AI'}
          </button>
        </div>
      </section>

      {draft && (
        <section
          className="rounded-xl p-4 mb-6 space-y-3"
          style={{ background: '#EFF6FF', border: `1px solid ${brand.primary}` }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-sm">Draft phản hồi</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: brand.surface }}>
              confidence {Math.round(draft.confidence * 100)}%
              {draftSource ? ` · source ${draftSource}` : ''}
            </span>
            <span className="text-xs" style={{ color: brand.muted }}>
              {draft.tone}
            </span>
          </div>
          {draft.suggestedActions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {draft.suggestedActions.map((action) => (
                <span
                  key={action}
                  className="text-xs rounded-full px-2 py-0.5"
                  style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                >
                  {action}
                </span>
              ))}
            </div>
          )}
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={6}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: brand.border, background: brand.surface }}
          />
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy || !replyText.trim()}
              onClick={() => void handleSend()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: brand.success }}
            >
              {busy ? 'Đang gửi…' : 'Duyệt & gửi'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDraft()}
              className="rounded-lg px-4 py-2 text-sm font-medium border disabled:opacity-50"
              style={{ borderColor: brand.border }}
            >
              Tạo lại draft
            </button>
          </div>
        </section>
      )}
    </AgentShell>
  );
}
