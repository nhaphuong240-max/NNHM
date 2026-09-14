import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { PRIVACY_POLICY_VERSION, submitLead, trackAnalyticsEvent, type SearchHit } from '../../lib/api';
import { getVisitorId } from '../../lib/visitor';
import { brand } from '../../theme/tokens';

type Props = {
  hit: SearchHit;
  onClose: () => void;
  onSuccess: (leadId: string) => void;
};

export function ContactLeadModal({ hit, onClose, onSuccess }: Props) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!privacyAccepted) {
      setError('Vui lòng đồng ý chính sách bảo mật.');
      return;
    }
    setSubmitting(true);
    setError(null);
    void trackAnalyticsEvent({
      name: 'contact_started',
      visitorId: getVisitorId(),
      payload: {
        unitId: hit.id,
        listingId: hit.listingId ?? hit.id,
        consentBasis: 'privacy_policy',
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      },
    });
    try {
      const res = await submitLead({
        fullName: fullName.trim(),
        phone: phone.trim(),
        unitId: hit.id,
        listingId: hit.listingId ?? hit.id,
        consent: { privacyAccepted: true, privacyPolicyVersion: PRIVACY_POLICY_VERSION },
        source: 'PUBLIC_SERP',
      });
      void trackAnalyticsEvent({
        name: 'lead_created',
        visitorId: getVisitorId(),
        payload: { leadId: res.data.id, unitId: hit.id, source: 'PUBLIC_SERP' },
      });
      onSuccess(res.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.45)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-lead-title"
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 shadow-xl"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="contact-lead-title" className="font-bold text-lg">
              Liên hệ tư vấn
            </h2>
            <p className="text-sm mt-1" style={{ color: brand.muted }}>
              {hit.attributes.title}
            </p>
          </div>
          <button type="button" className="text-sm font-medium" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm">
            Họ tên
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
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
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: brand.border }}
              placeholder="+84901234567"
            />
          </label>
          <label className="flex items-start gap-2 text-xs" style={{ color: brand.muted }}>
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mt-0.5"
            />
            Tôi đồng ý xử lý dữ liệu theo{' '}
            <Link to="/legal/privacy" className="underline" style={{ color: brand.primary }}>
              chính sách bảo mật
            </Link>{' '}
            NNHN.
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: brand.primary }}
          >
            {submitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
          </button>
        </form>
      </div>
    </div>
  );
}
