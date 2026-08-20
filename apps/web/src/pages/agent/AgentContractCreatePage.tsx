import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import {
  createContractDraft,
  fetchBookings,
  fetchContractTemplates,
  previewContract,
  type BookingDetail,
  type ContractPreviewData,
  type ContractTemplate,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

type Step = 'setup' | 'preview' | 'done';

export function AgentContractCreatePage() {
  const [searchParams] = useSearchParams();
  const presetBookingId = searchParams.get('bookingId') ?? '';

  const [step, setStep] = useState<Step>('setup');
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [bookings, setBookings] = useState<BookingDetail['data'][]>([]);
  const [templateId, setTemplateId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<ContractPreviewData | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchContractTemplates(), fetchBookings({ limit: 50 })])
      .then(([tplRes, bkRes]) => {
        setTemplates(tplRes.data);
        setBookings(bkRes.data);
        setTemplateId(tplRes.data[0]?.id ?? '');
        const match = bkRes.data.find((b) => b.id === presetBookingId);
        setBookingId(match?.id ?? bkRes.data[0]?.id ?? '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tải dữ liệu'))
      .finally(() => setLoading(false));
  }, [presetBookingId]);

  const runPreview = useCallback(async () => {
    if (!templateId || !bookingId) {
      setError('Chọn template và booking.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await previewContract({
        templateId,
        bookingId,
        overrides: {
          buyerName: buyerName.trim() || undefined,
          buyerPhone: buyerPhone.trim() || undefined,
        },
      });
      setPreview(res.data);
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview thất bại');
    } finally {
      setBusy(false);
    }
  }, [templateId, bookingId, buyerName, buyerPhone]);

  async function handleCreateDraft() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createContractDraft({
        templateId: preview.templateId,
        bookingId: preview.bookingId,
        leadId: preview.leadId,
        notes: notes.trim() || undefined,
        overrides: {
          buyerName: buyerName.trim() || undefined,
          buyerPhone: buyerPhone.trim() || undefined,
        },
      });
      setDraftId(res.data.id);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo draft thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AgentShell
      title="Tạo hợp đồng từ template"
      subtitle="UC-BK-06 · SCR-AGENT-006 · Merge booking + GR"
      screenTag="Agent · Contract wizard"
    >
      <Link to="/agent" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Agent dashboard
      </Link>

      <div className="flex gap-2 mb-6 text-xs font-semibold uppercase tracking-wide">
        {(['setup', 'preview', 'done'] as Step[]).map((s, i) => (
          <span
            key={s}
            className="px-3 py-1 rounded-full"
            style={{
              background: step === s ? brand.primary : brand.background,
              color: step === s ? '#fff' : brand.muted,
              border: `1px solid ${brand.border}`,
            }}
          >
            {i + 1}. {s === 'setup' ? 'Chọn' : s === 'preview' ? 'Preview' : 'Draft'}
          </span>
        ))}
      </div>

      {loading && <p style={{ color: brand.muted }}>Đang tải…</p>}
      {error && (
        <p className="rounded-lg p-3 text-sm mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {!loading && step === 'setup' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <section className="space-y-4">
            <label className="block text-sm">
              <span style={{ color: brand.muted }}>Template hợp đồng</span>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                style={{ borderColor: brand.border, background: brand.surface }}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {templates.find((t) => t.id === templateId)?.description && (
              <p className="text-xs" style={{ color: brand.muted }}>
                {templates.find((t) => t.id === templateId)?.description}
              </p>
            )}

            <label className="block text-sm">
              <span style={{ color: brand.muted }}>Booking</span>
              <select
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
                style={{ borderColor: brand.border, background: brand.surface }}
              >
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id} · {b.attributes.status} · unit {b.attributes.unitId}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span style={{ color: brand.muted }}>Tên buyer (override)</span>
                <input
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Auto từ lead"
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: brand.border }}
                />
              </label>
              <label className="block text-sm">
                <span style={{ color: brand.muted }}>SĐT buyer</span>
                <input
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: brand.border }}
                />
              </label>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void runPreview()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: brand.primary }}
            >
              {busy ? 'Đang merge…' : 'Preview hợp đồng →'}
            </button>
          </section>

          <section
            className="rounded-xl p-4 text-sm"
            style={{ background: '#EFF6FF', border: `1px solid ${brand.primary}` }}
          >
            <p className="font-semibold mb-2">Luồng UC-BK-06</p>
            <ol className="list-decimal list-inside space-y-1" style={{ color: brand.muted }}>
              <li>Chọn template + booking RESERVED/DEPOSITED</li>
              <li>Merge buyer + unit GR + deposit</li>
              <li>Preview văn bản · lưu DRAFT (audit trail)</li>
              <li>UC-BK-07 e-sign (buyer portal — wave G)</li>
            </ol>
            <p className="text-xs mt-3">
              Demo booking: <strong>bk_contract01</strong> · lead <strong>ld_01</strong>
            </p>
          </section>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{preview.templateLabel}</p>
              <p className="text-xs font-mono" style={{ color: brand.muted }}>
                {preview.bookingId} · {String((preview.mergeContext as { unitCode?: string }).unitCode ?? '')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('setup')}
                className="rounded-lg px-3 py-1.5 text-sm border"
                style={{ borderColor: brand.border }}
              >
                ← Sửa
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCreateDraft()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: brand.primary }}
              >
                {busy ? 'Đang lưu…' : 'Lưu DRAFT'}
              </button>
            </div>
          </div>

          <label className="block text-sm">
            <span style={{ color: brand.muted }}>Ghi chú nội bộ (optional)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: brand.border }}
            />
          </label>

          <pre
            className="rounded-xl p-4 text-sm whitespace-pre-wrap overflow-auto max-h-[480px]"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            {preview.mergedText}
          </pre>
        </div>
      )}

      {step === 'done' && draftId && (
        <div
          className="rounded-xl p-6 text-center space-y-3"
          style={{ background: '#ECFDF5', border: '1px solid #6EE7B7' }}
        >
          <p className="text-lg font-bold" style={{ color: brand.success }}>
            Contract DRAFT đã lưu
          </p>
          <p className="font-mono text-sm">{draftId}</p>
          <p className="text-sm" style={{ color: brand.muted }}>
            Immutable audit · entityType contract · sẵn sàng e-sign UC-BK-07
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('setup');
                setPreview(null);
                setDraftId(null);
              }}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: brand.primary }}
            >
              Tạo hợp đồng khác
            </button>
            <Link
              to={`/agent/bookings/${preview?.bookingId ?? bookingId}`}
              className="rounded-lg px-4 py-2 text-sm border"
              style={{ borderColor: brand.border, background: brand.surface }}
            >
              Xem booking
            </Link>
          </div>
        </div>
      )}
    </AgentShell>
  );
}
