import { useState } from 'react';
import { generateListingCopilot, type CopilotTone } from '../lib/api';
import { brand } from '../theme/tokens';

const TONES: { value: CopilotTone; label: string }[] = [
  { value: 'premium', label: 'Premium' },
  { value: 'standard', label: 'Standard' },
  { value: 'investment', label: 'Đầu tư' },
];

export function AICopilotPanel({
  unitId,
  priceDisplay,
  disabled,
  onApply,
  onUsedChange,
}: {
  unitId: string;
  priceDisplay?: number;
  disabled?: boolean;
  onApply: (payload: { title: string; description: string }) => void;
  onUsedChange?: (used: boolean, approved: boolean) => void;
}) {
  const [tone, setTone] = useState<CopilotTone>('premium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    title: string;
    content: string;
    disclaimer: string;
    latencyMs: number;
  } | null>(null);
  const [approved, setApproved] = useState(false);

  async function handleGenerate() {
    if (!unitId) {
      setError('Chọn unit trước khi gọi AI copilot');
      return;
    }
    setLoading(true);
    setError(null);
    setApproved(false);
    onUsedChange?.(true, false);
    try {
      const res = await generateListingCopilot({
        unitId,
        task: 'LISTING_DESCRIPTION',
        tone,
        language: 'vi',
        context: priceDisplay ? { priceDisplay } : undefined,
      });
      setPreview({
        title: res.data.attributes.title,
        content: res.data.attributes.content,
        disclaimer: res.data.attributes.disclaimer,
        latencyMs: res.data.attributes.latencyMs,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI copilot không khả dụng');
      onUsedChange?.(false, false);
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!preview) return;
    onApply({ title: preview.title, description: preview.content });
    setApproved(true);
    onUsedChange?.(true, true);
  }

  return (
    <section
      className="rounded-xl p-5 space-y-4"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: brand.muted }}>
          UC-AI-01 · FR-AI-01
        </p>
        <h3 className="font-bold text-lg mt-1" style={{ color: brand.primaryDark }}>
          AI Copilot
        </h3>
        <p className="text-xs mt-1" style={{ color: brand.muted }}>
          Generate copy tiếng Việt · human approve bắt buộc trước publish
        </p>
      </div>

      <label className="block text-sm">
        <span className="font-medium">Tone</span>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as CopilotTone)}
          disabled={disabled || loading}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: brand.border }}
        >
          {TONES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        disabled={disabled || loading || !unitId}
        onClick={() => void handleGenerate()}
        className="w-full rounded-xl py-2.5 font-semibold text-white disabled:opacity-50"
        style={{ background: brand.primary }}
      >
        {loading ? 'Đang tạo nội dung…' : 'Tạo mô tả AI'}
      </button>

      {error && (
        <p className="text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {preview && (
        <div className="space-y-3">
          <div
            className="rounded-lg p-3 text-sm whitespace-pre-wrap"
            style={{ background: brand.background, border: `1px solid ${brand.border}` }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: brand.muted }}>
              Preview · {preview.latencyMs}ms
            </p>
            <p className="font-semibold mb-2">{preview.title}</p>
            {preview.content}
          </div>

          <div
            className="rounded-lg p-3 text-xs"
            style={{ background: '#FFEDD5', border: '1px solid #FED7AA', color: '#C2410C' }}
          >
            {preview.disclaimer}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 rounded-lg py-2 text-sm font-semibold text-white"
              style={{ background: brand.success }}
            >
              Dùng bản này
            </button>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading}
              className="flex-1 rounded-lg py-2 text-sm font-semibold border"
              style={{ borderColor: brand.border }}
            >
              Tạo lại
            </button>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={approved}
              onChange={(e) => {
                setApproved(e.target.checked);
                onUsedChange?.(true, e.target.checked);
              }}
            />
            <span>
              Human approve (FR-AI-04): Tôi đã đọc và chịu trách nhiệm nội dung AI trước khi gửi duyệt
            </span>
          </label>
        </div>
      )}
    </section>
  );
}
