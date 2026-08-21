import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useCompareBasket } from '../../hooks/useCompareBasket';
import { useUnitStatusStream } from '../../hooks/useUnitStatusStream';
import {
  fetchUnitDetail,
  fetchUnitMedia,
  PRIVACY_POLICY_VERSION,
  submitLead,
  type UnitDetail,
} from '../../lib/api';
import { brand, formatPrice } from '../../theme/tokens';
import { ContactLeadModal } from '../../components/public/ContactLeadModal';
import { PublicTopBar } from '../../components/PublicTopBar';
import { StickyContactBar } from '../../components/public/StickyContactBar';
import { UnitGallery } from '../../components/public/UnitGallery';
import { VerifiedBadge } from '../../components/public/VerifiedBadge';

function statusLabel(status: string) {
  switch (status) {
    case 'AVAILABLE':
      return { text: 'Còn hàng', color: brand.success };
    case 'RESERVED':
      return { text: 'Đang giữ chỗ', color: brand.warning };
    case 'SOLD':
      return { text: 'Đã bán', color: brand.muted };
    default:
      return { text: status, color: brand.muted };
  }
}

export function PublicUnitDetailPage() {
  const { unitId = 'un_01' } = useParams<{ unitId: string }>();
  const [searchParams] = useSearchParams();
  const { ids: compareIds, add: addCompare, count: compareCount } = useCompareBasket();
  const [compareMsg, setCompareMsg] = useState<string | null>(null);
  const [detail, setDetail] = useState<UnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [thankYou, setThankYou] = useState<{ leadId: string; tier: string } | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [statusFlash, setStatusFlash] = useState(false);

  const handleStreamStatus = useCallback(
    (event: { unitId: string; status: string }) => {
      if (event.unitId !== unitId) return;
      setLiveStatus(event.status);
      setStatusFlash(true);
      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: {
            ...prev.data,
            attributes: { ...prev.data.attributes, unitStatus: event.status },
          },
        };
      });
      window.setTimeout(() => setStatusFlash(false), 2500);
    },
    [unitId],
  );

  const { state: streamState } = useUnitStatusStream({ onStatusChange: handleStreamStatus });

  const leadAttribution = useMemo(() => {
    const utm: Record<string, string> = {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const value = searchParams.get(key);
      if (value) utm[key] = value;
    }
    const campaignId = searchParams.get('campaign_id')?.trim() || undefined;
    return {
      ...(Object.keys(utm).length > 0 ? { utm } : {}),
      ...(campaignId ? { campaignId } : {}),
    };
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchUnitDetail(unitId)
      .then((d) => {
        if (active) setDetail(d);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Lỗi tải chi tiết');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [unitId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!detail || !privacyAccepted) {
      setSubmitError('Vui lòng đồng ý chính sách bảo mật (PDPA) trước khi gửi.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitLead({
        fullName,
        phone,
        email: email || undefined,
        message: message || undefined,
        unitId: detail.data.id,
        listingId: detail.data.listingId,
        consent: {
          privacyAccepted: true,
          marketing,
          privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        },
        ...leadAttribution,
      });
      setThankYou({
        leadId: result.data.id,
        tier: result.data.attributes.tier,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gửi yêu cầu thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  const attrs = detail?.data.attributes;
  const displayStatus = liveStatus ?? attrs?.unitStatus ?? '';
  const live = displayStatus ? statusLabel(displayStatus) : null;

  return (
    <div className="min-h-screen pb-24 lg:pb-0" style={{ background: brand.background }}>
      <PublicTopBar />

      <header className="text-white px-4 py-4" style={{ background: brand.primary }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{attrs?.title ?? 'Chi tiết sản phẩm'}</h1>
            {attrs?.projectId && (
              <Link
                to={`/public/projects/${attrs.projectId}`}
                className="text-sm underline opacity-90 mt-1 inline-block"
              >
                {attrs.projectName} →
              </Link>
            )}
          </div>
          <div className="flex gap-4 text-sm">
            <Link to="/public/search" className="underline opacity-90">
              Tìm kiếm
            </Link>
            <Link to="/public/map" className="underline opacity-90">
              Bản đồ
            </Link>
            <Link
              to={compareCount > 0 ? `/public/compare?ids=${compareIds.join(',')}` : '/public/compare'}
              className="underline opacity-90"
            >
              So sánh{compareCount > 0 ? ` (${compareCount})` : ''}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 lg:p-6">
        {loading && <p className="text-sm" style={{ color: brand.muted }}>Đang tải…</p>}
        {error && (
          <div className="rounded-xl bg-red-50 text-red-700 p-4 text-sm mb-6">{error}</div>
        )}

        {attrs && (
          <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
            <div className="space-y-6">
              <UnitGallery
                unitId={unitId}
                fallbackUrl={attrs.thumbnailUrl}
                alt={attrs.title}
                loadMedia={fetchUnitMedia}
              />

              <div className="flex flex-wrap gap-2 items-center">
                {attrs.verified && <VerifiedBadge />}
                {live && (
                  <span
                    className="text-xs font-bold px-2 py-1 rounded text-white transition-all"
                    style={{
                      background: live.color,
                      boxShadow: statusFlash ? `0 0 0 3px ${live.color}55` : undefined,
                    }}
                  >
                    {live.text}
                  </span>
                )}
                <span
                  className="text-xs px-2 py-1 rounded font-mono"
                  style={{
                    background: streamState === 'live' ? '#DCFCE7' : '#F1F5F9',
                    color: streamState === 'live' ? brand.success : brand.muted,
                  }}
                >
                  {streamState === 'live' ? '● Live SSE' : streamState === 'connecting' ? '… SSE' : '○ SSE offline'}
                </span>
                <span
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                >
                  Anti-drift: {attrs.antiDriftStatus}
                </span>
              </div>

              <p className="text-sm" style={{ color: brand.muted }}>
                {attrs.projectName} · {attrs.code} · Tầng {attrs.floor} · {attrs.bedrooms}PN ·{' '}
                {attrs.area}m²
              </p>

              <p className="text-3xl font-bold" style={{ color: brand.primary }}>
                {formatPrice(attrs.priceDisplay ?? attrs.basePrice)}
              </p>

              <p className="text-sm leading-relaxed">{attrs.description}</p>

              {attrs.highlights.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {attrs.highlights.map((h) => (
                    <li
                      key={h}
                      className="text-xs px-3 py-1 rounded-full"
                      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                    >
                      {h}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  disabled={compareIds.includes(unitId)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
                  style={{
                    borderColor: compareIds.includes(unitId) ? brand.success : brand.primary,
                    color: compareIds.includes(unitId) ? brand.success : brand.primary,
                  }}
                  onClick={() => {
                    const result = addCompare(unitId);
                    if (result.added) {
                      setCompareMsg(`Đã thêm ${attrs.code} vào so sánh (${result.ids.length}/3)`);
                    } else if (result.full) {
                      setCompareMsg('Tối đa 3 căn — mở trang so sánh để gỡ bớt.');
                    } else {
                      setCompareMsg('Căn này đã có trong danh sách so sánh.');
                    }
                  }}
                >
                  {compareIds.includes(unitId) ? '✓ Đã thêm so sánh' : '+ Thêm vào so sánh'}
                </button>
                {compareCount >= 2 && (
                  <Link
                    to={`/public/compare?ids=${compareIds.join(',')}`}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                    style={{ background: brand.primaryDark }}
                  >
                    Mở bảng so sánh ({compareCount})
                  </Link>
                )}
              </div>
              {compareMsg && (
                <p className="text-xs rounded-lg p-2" style={{ background: '#EFF6FF', color: brand.primary }}>
                  {compareMsg}
                </p>
              )}

              <table
                className="w-full text-sm rounded-xl overflow-hidden"
                style={{ border: `1px solid ${brand.border}` }}
              >
                <tbody>
                  {[
                    ['Mã căn', attrs.code],
                    ['Diện tích', `${attrs.area} m²`],
                    ['Phòng ngủ', String(attrs.bedrooms)],
                    ['Tầng', String(attrs.floor)],
                    ['Giá GR', formatPrice(attrs.basePrice)],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b" style={{ borderColor: brand.border }}>
                      <td className="p-3 font-medium w-1/3" style={{ background: brand.surface }}>
                        {label}
                      </td>
                      <td className="p-3">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="lg:sticky lg:top-6" id="contact-form">
              {thankYou ? (
                <div
                  className="rounded-2xl p-6 space-y-3 text-center"
                  style={{ background: '#ECFDF5', border: `1px solid ${brand.success}` }}
                >
                  <p className="text-2xl">✓</p>
                  <h2 className="font-bold text-lg" style={{ color: brand.success }}>
                    Cảm ơn bạn!
                  </h2>
                  <p className="text-sm">
                    Yêu cầu tư vấn đã được ghi nhận · Lead{' '}
                    <strong>{thankYou.leadId}</strong> · {thankYou.tier}
                  </p>
                  <p className="text-xs" style={{ color: brand.muted }}>
                    Chuyên viên sẽ liên hệ trong 24h · consent PDPA đã lưu
                  </p>
                  <Link
                    to="/public/search"
                    className="inline-block text-sm underline mt-2"
                    style={{ color: brand.primary }}
                  >
                    Xem thêm căn khác
                  </Link>
                </div>
              ) : (
                <form
                  onSubmit={onSubmit}
                  className="rounded-2xl p-5 space-y-4"
                  style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                >
                  <div>
                    <h2 className="font-bold text-lg">Đăng ký tư vấn</h2>
                    <p className="text-xs mt-1" style={{ color: brand.muted }}>
                      UC-CRM-01 · ≤3 click · BR-15 consent bắt buộc
                    </p>
                  </div>

                  <label className="block text-sm">
                    Họ và tên *
                    <input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2.5"
                      style={{ borderColor: brand.border }}
                    />
                  </label>
                  <label className="block text-sm">
                    Số điện thoại *
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+84901234567"
                      className="mt-1 w-full rounded-xl border px-3 py-2.5"
                      style={{ borderColor: brand.border }}
                    />
                  </label>
                  <label className="block text-sm">
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2.5"
                      style={{ borderColor: brand.border }}
                    />
                  </label>
                  <label className="block text-sm">
                    Ghi chú
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2.5"
                      style={{ borderColor: brand.border }}
                    />
                  </label>

                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      required
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      Tôi đồng ý với{' '}
                      <a href="#" className="underline" style={{ color: brand.primary }}>
                        Chính sách bảo mật
                      </a>{' '}
                      (v{PRIVACY_POLICY_VERSION}) *
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={marketing}
                      onChange={(e) => setMarketing(e.target.checked)}
                      className="mt-1"
                    />
                    <span>Nhận thông tin ưu đãi qua SMS/Email (tùy chọn)</span>
                  </label>

                  {submitError && (
                    <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{submitError}</div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !privacyAccepted}
                    className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-50"
                    style={{ background: brand.primary }}
                  >
                    {submitting ? 'Đang gửi…' : 'Gửi yêu cầu tư vấn'}
                  </button>
                  <Link
                    to={`/auth/login?portal=agent&unitId=${unitId}`}
                    className="block w-full rounded-xl py-3 font-semibold text-center no-underline"
                    style={{ background: brand.hover, color: brand.primaryDark }}
                  >
                    Giữ chỗ (đăng nhập agent)
                  </Link>
                </form>
              )}
            </aside>
          </div>
        )}
      </main>

      {attrs && !thankYou && (
        <StickyContactBar
          price={attrs.priceDisplay ?? attrs.basePrice}
          onContact={() => setShowContactModal(true)}
          holdHref={`/auth/login?portal=agent&unitId=${unitId}`}
        />
      )}

      {showContactModal && detail && (
        <ContactLeadModal
          hit={{
            id: detail.data.id,
            listingId: detail.data.listingId,
            attributes: {
              code: attrs!.code,
              projectName: attrs!.projectName,
              projectId: attrs!.projectId,
              basePrice: attrs!.basePrice,
              bedrooms: attrs!.bedrooms,
              area: attrs!.area,
              title: attrs!.title,
              verified: attrs!.verified,
              thumbnailUrl: attrs!.thumbnailUrl ?? null,
              city: attrs!.city,
              district: attrs!.district,
            },
          }}
          onClose={() => setShowContactModal(false)}
          onSuccess={() => setShowContactModal(false)}
        />
      )}
    </div>
  );
}
