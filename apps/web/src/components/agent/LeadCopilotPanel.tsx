import { useState } from 'react';
import {
  approveLeadCopilotDraft,
  generateLeadCopilot,
  type LeadCopilotResult,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

type Props = {
  leadId: string;
};

/** P2 FR-AI-002 — lead summary + next action, outbound human review */
export function LeadCopilotPanel({ leadId }: Props) {
  const [draft, setDraft] = useState<LeadCopilotResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    setApproved(false);
    try {
      const res = await generateLeadCopilot(leadId);
      setDraft(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Copilot thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!draft) return;
    setBusy(true);
    try {
      await approveLeadCopilotDraft(draft.id);
      setApproved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Duyệt thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-xl p-5 space-y-3"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Copilot lead (P2)</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleGenerate()}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          style={{ background: brand.primary }}
        >
          Tóm tắt
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: brand.destructive }}>
          {error}
        </p>
      )}
      {draft && (
        <>
          <p className="text-sm">{draft.attributes.summary ?? draft.attributes.content}</p>
          {draft.attributes.nextActions && draft.attributes.nextActions.length > 0 && (
            <ul className="text-xs list-disc pl-4 space-y-1">
              {draft.attributes.nextActions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
          <p className="text-xs" style={{ color: brand.muted }}>
            {draft.attributes.disclaimer}
          </p>
          {!approved && draft.attributes.requiresApproval && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleApprove()}
              className="rounded-lg px-3 py-1.5 text-xs font-medium border disabled:opacity-50"
              style={{ borderColor: brand.border }}
            >
              Duyệt outbound
            </button>
          )}
          {approved && (
            <p className="text-xs font-medium" style={{ color: brand.success }}>
              Đã duyệt — có thể dùng nội dung outbound
            </p>
          )}
        </>
      )}
    </section>
  );
}
