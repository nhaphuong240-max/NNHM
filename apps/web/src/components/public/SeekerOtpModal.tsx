import { FormEvent, useState } from 'react';
import { requestSeekerOtp, verifySeekerOtp } from '../../lib/api';
import { setSeekerSession } from '../../lib/seeker';
import { getVisitorId } from '../../lib/visitor';
import { brand } from '../../theme/tokens';

type Props = {
  onClose: () => void;
  onVerified: (phone: string) => void;
};

/** P0 §0.2(3) — seeker OTP for multi-device saved search alerts. */
export function SeekerOtpModal({ onClose, onVerified }: Props) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await requestSeekerOtp(phone.trim(), getVisitorId());
      setChallengeId(res.data.challengeId);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi OTP thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function confirmOtp(e: FormEvent) {
    e.preventDefault();
    if (!challengeId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await verifySeekerOtp({
        challengeId,
        code: code.trim(),
        phone: phone.trim(),
        visitorId: getVisitorId(),
      });
      const normalized = phone.trim();
      setSeekerSession({
        accessToken: res.data.accessToken,
        userId: res.data.userId,
        phone: normalized,
        verifiedAt: new Date().toISOString(),
      });
      onVerified(normalized);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mã OTP không đúng');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.45)' }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 shadow-xl"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-lg">Xác minh SĐT seeker</h2>
            <p className="text-sm mt-1" style={{ color: brand.muted }}>
              Nhận cảnh báo tìm kiếm trên mọi thiết bị · consent PDPA
            </p>
          </div>
          <button type="button" className="text-sm font-medium" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        {step === 'phone' ? (
          <form className="space-y-3" onSubmit={sendOtp}>
            <label className="block text-sm">
              Số điện thoại
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+84901234567"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: brand.border }}
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
              style={{ background: brand.primary }}
            >
              {busy ? 'Đang gửi…' : 'Gửi mã OTP'}
            </button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={confirmOtp}>
            <p className="text-xs" style={{ color: brand.muted }}>
              Mã đã gửi tới {phone}. Kiểm tra SMS (sandbox có thể log server).
            </p>
            <label className="block text-sm">
              Mã OTP
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm tracking-widest"
                style={{ borderColor: brand.border }}
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
              style={{ background: brand.primary }}
            >
              {busy ? 'Đang xác minh…' : 'Xác minh'}
            </button>
            <button
              type="button"
              className="w-full text-xs font-medium"
              style={{ color: brand.muted }}
              onClick={() => {
                setStep('phone');
                setCode('');
                setChallengeId(null);
              }}
            >
              Đổi số điện thoại
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
