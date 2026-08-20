import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BuyerShell } from '../../components/BuyerShell';
import {
  fetchContractSignSession,
  signContract,
  type ContractSignSession,
} from '../../lib/api';
import { brand } from '../../theme/tokens';
import { DEFAULT_TENANT_ID } from '../../lib/constants';

const DEMO_CONTRACT_ID = 'ctr_esign_demo01';
const PILOT_CONTRACT_ID = 'ctr_pilot_deposit01';
const PILOT_TENANT_ID = 'ten_pilot_cdt_01';

export function BuyerEsignPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const contractId = params.get('contractId')?.trim() || DEMO_CONTRACT_ID;
  const tenantId =
    params.get('tenantId')?.trim() ||
    (contractId === PILOT_CONTRACT_ID ? PILOT_TENANT_ID : DEFAULT_TENANT_ID);

  const [session, setSession] = useState<ContractSignSession | null>(null);
  const [signerName, setSignerName] = useState('');
  const [otp, setOtp] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    documentId?: string;
    documentVaultRef?: string;
    bookingId: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchContractSignSession(contractId, tenantId);
      setSession(res.data);
      setSignerName(res.data.buyerName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được hợp đồng');
    } finally {
      setLoading(false);
    }
  }, [contractId, tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError('Vui lòng đồng ý điều khoản trước khi ký');
      return;
    }
    if (!session) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await signContract(
        contractId,
        {
          signerName: signerName.trim(),
          otp: otp.trim(),
          consent: true,
          envelopeId: session.envelopeId,
        },
        tenantId,
      );
      setSuccess({
        documentId: res.data.attributes.documentId,
        documentVaultRef: res.data.attributes.documentVaultRef,
        bookingId: res.data.attributes.bookingId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ký thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  const isDemoOtp = session?.otpHint?.includes('123456');

  return (
    <BuyerShell
      title="Ký hợp đồng điện tử"
      subtitle="UC-BK-07 · SCR-BUYER-003 · e-sign + document vault"
    >
      <Link to="/buyer/deals" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Deals
      </Link>

      {loading && <p style={{ color: brand.muted }}>Đang tải hợp đồng…</p>}

      {error && !success && (
        <p className="text-sm rounded-lg p-3 mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {success && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: '#ECFDF5', border: `1px solid ${brand.success}` }}
        >
          <p className="font-semibold" style={{ color: brand.success }}>
            Đã ký thành công
          </p>
          <p className="text-sm" style={{ color: brand.muted }}>
            Document Vault ID:{' '}
            <code className="text-xs">{success.documentId ?? success.documentVaultRef ?? '—'}</code>
          </p>
          <button
            type="button"
            className="w-full rounded-xl py-3 font-semibold text-white"
            style={{ background: brand.primary }}
            onClick={() => navigate(`/buyer/deals/${encodeURIComponent(success.bookingId)}`)}
          >
            Về deal tracker →
          </button>
        </div>
      )}

      {session && !success && (
        <div className="space-y-4">
          <section
            className="rounded-xl p-4"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <p className="text-xs" style={{ color: brand.muted }}>
              {session.templateLabel} · {session.unitCode}
            </p>
            <p className="text-sm font-medium mt-1">Booking {session.bookingId}</p>
            {session.provider && session.providerMode === 'legal-provider' && (
              <p className="text-xs mt-1" style={{ color: brand.muted }}>
                Nhà cung cấp: {session.provider}
                {session.signingUrl ? (
                  <>
                    {' '}
                    ·{' '}
                    <a href={session.signingUrl} className="underline" target="_blank" rel="noreferrer">
                      Mở phiên ký pháp lý
                    </a>
                  </>
                ) : null}
              </p>
            )}
            <pre
              className="mt-3 text-xs whitespace-pre-wrap max-h-64 overflow-y-auto p-3 rounded-lg"
              style={{ background: brand.background, color: '#334155' }}
            >
              {session.mergedText}
            </pre>
          </section>

          <form onSubmit={(e) => void handleSign(e)} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Họ tên người ký</label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: brand.border }}
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">OTP xác thực</label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                style={{ borderColor: brand.border }}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder={isDemoOtp ? '123456' : 'Mã OTP từ SMS'}
                inputMode="numeric"
                required
              />
              <p className="text-xs mt-1" style={{ color: brand.muted }}>
                {session.otpHint ?? (isDemoOtp ? undefined : 'OTP gửi qua SMS — không dùng mã demo trên tenant LIVE')}
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />
              <span>
                Tôi đã đọc và đồng ý ký điện tử hợp đồng này theo quy định WEREAL (UC-BK-07).
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60"
              style={{ background: brand.success }}
            >
              {submitting ? 'Đang ký…' : 'Ký điện tử'}
            </button>
          </form>
        </div>
      )}
    </BuyerShell>
  );
}
