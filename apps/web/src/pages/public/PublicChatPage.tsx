import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  sendPublicChatMessage,
  startPublicChatSession,
  type ChatMessage,
} from '../../lib/api';
import { brand, formatPrice } from '../../theme/tokens';

type Recommendation = {
  unitId: string;
  code: string;
  title: string;
  basePrice: number;
  reason: string;
};

export function PublicChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [captureName, setCaptureName] = useState('');
  const [capturePhone, setCapturePhone] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    startPublicChatSession()
      .then((res) => {
        if (active) {
          setSessionId(res.data.sessionId);
          setMessages(res.data.messages);
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Không khởi tạo chat');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showCapture]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !sessionId || busy) return;
    setBusy(true);
    setError(null);
    setInput('');
    try {
      const captureLead =
        capturePhone.trim() && !leadId
          ? { fullName: captureName.trim() || undefined, phone: capturePhone.trim() }
          : undefined;
      const res = await sendPublicChatMessage({ sessionId, text, captureLead });
      setMessages(res.data.messages);
      if (res.data.recommendations?.length) {
        setRecommendations(res.data.recommendations);
      }
      if (res.data.leadId) {
        setLeadId(res.data.leadId);
        setShowCapture(false);
      } else if (res.data.suggestCapture) {
        setShowCapture(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi tin nhắn thất bại');
      setInput(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: brand.background }}>
      <header className="text-white px-4 py-4 shrink-0" style={{ background: brand.primary }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs opacity-80">UC-AI-07 · FR-LEAD-001</p>
            <h1 className="text-xl font-bold">Tư vấn AI</h1>
          </div>
          <Link to="/public/search" className="text-sm underline opacity-90">
            Tìm kiếm
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>
        )}

        {leadId && (
          <div
            className="rounded-lg p-3 text-sm"
            style={{ background: brand.accentSoft, border: `1px solid ${brand.accent}` }}
          >
            Đã ghi nhận liên hệ · Lead <span className="font-mono">{leadId}</span> — agent sẽ gọi lại sớm.
          </div>
        )}

        <div
          className="flex-1 rounded-xl p-4 space-y-3 overflow-y-auto min-h-[360px]"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          {loading ? (
            <p className="text-sm" style={{ color: brand.muted }}>
              Đang khởi tạo phiên chat…
            </p>
          ) : messages.length === 0 ? (
            <p className="text-sm" style={{ color: brand.muted }}>
              Xin chào! Hỏi về căn hộ, giá, hoặc dự án bạn quan tâm.
            </p>
          ) : (
            messages.map((msg, i) => (
              <div
                key={`${msg.at}-${i}`}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[85%] rounded-xl px-3 py-2 text-sm"
                  style={{
                    background: msg.role === 'user' ? brand.primary : brand.background,
                    color: msg.role === 'user' ? '#fff' : brand.primaryDark,
                    border: msg.role === 'assistant' ? `1px solid ${brand.border}` : undefined,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {recommendations.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-semibold text-sm">Gợi ý căn phù hợp</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {recommendations.map((rec) => (
                <Link
                  key={rec.unitId}
                  to={`/public/units/${rec.unitId}`}
                  className="rounded-xl p-3 hover:shadow-sm transition-shadow"
                  style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                >
                  <p className="font-medium text-sm">{rec.title}</p>
                  <p className="text-xs mt-1" style={{ color: brand.muted }}>
                    {rec.code} · {formatPrice(rec.basePrice)}
                  </p>
                  <p className="text-xs mt-1">{rec.reason}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {showCapture && !leadId && (
          <section
            className="rounded-xl p-4 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <p className="text-sm font-medium">Để lại SĐT — em gửi bảng giá / đặt lịch xem nhà</p>
            <input
              value={captureName}
              onChange={(e) => setCaptureName(e.target.value)}
              placeholder="Họ tên (tuỳ chọn)"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: brand.border }}
            />
            <input
              value={capturePhone}
              onChange={(e) => setCapturePhone(e.target.value)}
              type="tel"
              placeholder="0901234567"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: brand.border }}
            />
            <p className="text-xs" style={{ color: brand.muted }}>
              Hoặc nhập SĐT trực tiếp trong tin nhắn — hệ thống tự nhận diện.
            </p>
          </section>
        )}

        <form onSubmit={handleSend} className="flex gap-2 shrink-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!sessionId || busy}
            placeholder="Nhập câu hỏi…"
            className="flex-1 rounded-xl border px-4 py-2.5 text-sm disabled:opacity-50"
            style={{ borderColor: brand.border, background: brand.surface }}
          />
          <button
            type="submit"
            disabled={!sessionId || busy || !input.trim()}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: brand.primary }}
          >
            {busy ? '…' : 'Gửi'}
          </button>
        </form>
      </main>
    </div>
  );
}
