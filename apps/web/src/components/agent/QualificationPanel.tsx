import { FormEvent, useState } from 'react';
import { patchLeadQualification } from '../../lib/api';
import { brand } from '../../theme/tokens';

type Props = {
  leadId: string;
  requirement?: Record<string, unknown> | null;
  onUpdated?: () => void;
};

/** P1 FR-LEAD-005b — budget / timeline / loan before BOOKING. */
export function QualificationPanel({ leadId, requirement, onUpdated }: Props) {
  const [budget, setBudget] = useState(String((requirement?.budget as number) ?? ''));
  const [timeline, setTimeline] = useState(String(requirement?.timeline ?? ''));
  const [loanIntent, setLoanIntent] = useState(
    String(requirement?.loanIntent ?? 'unknown'),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await patchLeadQualification(leadId, {
        budget: budget ? Number(budget) : undefined,
        timeline: timeline.trim() || undefined,
        loanIntent: loanIntent as 'cash' | 'bank_loan' | 'mixed' | 'unknown',
      });
      setMsg('Đã lưu qualification — có thể chuyển BOOKING.');
      onUpdated?.();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl p-4 space-y-3"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <h3 className="font-semibold text-sm">Qualification (bắt buộc trước BOOKING)</h3>
      <label className="block text-xs">
        Ngân sách (VND)
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block text-xs">
        Timeline mua
        <input
          value={timeline}
          onChange={(e) => setTimeline(e.target.value)}
          placeholder="3 tháng / Q4 2026"
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block text-xs">
        Vay ngân hàng
        <select
          value={loanIntent}
          onChange={(e) => setLoanIntent(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
        >
          <option value="unknown">Chưa rõ</option>
          <option value="cash">Tiền mặt</option>
          <option value="bank_loan">Vay NH</option>
          <option value="mixed">Hỗn hợp</option>
        </select>
      </label>
      {msg && <p className="text-xs" style={{ color: brand.primary }}>{msg}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg py-2 text-xs font-bold text-white disabled:opacity-60"
        style={{ background: brand.primary }}
      >
        {busy ? 'Đang lưu…' : 'Lưu qualification'}
      </button>
    </form>
  );
}
