import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PublicTopBar } from '../../components/PublicTopBar';
import { fetchWalkInGallery, walkInCheckIn } from '../../lib/api';
import { PRIVACY_POLICY_VERSION } from '../../lib/constants';
import { brand } from '../../theme/tokens';

export function PublicWalkInPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [title, setTitle] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ leadId: string; replay: boolean } | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchWalkInGallery(token)
      .then((res) => {
        if (active) setTitle(res.data.title);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Gallery không tồn tại');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await walkInCheckIn(token, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        consent: consent
          ? { privacyAccepted: true, privacyPolicyVersion: PRIVACY_POLICY_VERSION }
          : undefined,
      });
      setSuccess({ leadId: res.data.leadId, replay: res.data.replay });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: brand.background }}>
      <PublicTopBar />
      <main className="max-w-md mx-auto p-4 py-8">
        <p className="text-xs mb-2" style={{ color: brand.muted }}>
          FR-DP-005 · Walk-in gallery
        </p>
        <h1 className="text-2xl font-bold mb-1">{loading ? 'Đang tải…' : title || 'Sales Gallery'}</h1>
        <p className="text-sm mb-6" style={{ color: brand.muted }}>
          Quét QR tại gallery · đăng ký tham quan · agent liên hệ ngay
        </p>

        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm mb-4">{error}</div>
        )}

        {success ? (
          <div
            className="rounded-xl p-5 space-y-2"
            style={{ background: brand.accentSoft, border: `1px solid ${brand.accent}` }}
          >
            <p className="font-semibold">
              {success.replay ? 'Bạn đã check-in gallery hôm nay' : 'Check-in thành công!'}
            </p>
            <p className="text-sm" style={{ color: brand.muted }}>
              Mã lead: <span className="font-mono">{success.leadId}</span>
            </p>
            <Link to="/public/chat" className="text-sm underline" style={{ color: brand.primary }}>
              Chat với trợ lý AI
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl p-5 space-y-4"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <label className="block text-sm">
              Họ tên
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: brand.border }}
              />
            </label>
            <label className="block text-sm">
              Số điện thoại
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901234567"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: brand.border }}
              />
            </label>
            <label className="flex items-start gap-2 text-xs" style={{ color: brand.muted }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
              />
              Tôi đồng ý xử lý dữ liệu theo chính sách PDPA ({PRIVACY_POLICY_VERSION})
            </label>
            <button
              type="submit"
              disabled={busy || loading || !consent}
              className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
              style={{ background: brand.primary }}
            >
              {busy ? 'Đang gửi…' : 'Check-in gallery'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
