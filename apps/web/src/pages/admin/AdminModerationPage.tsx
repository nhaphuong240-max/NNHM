import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import { DriftPanel } from '../../components/DriftPanel';
import {
  approveListing,
  fetchListings,
  rejectListing,
  type ListingRecord,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

function formatVnd(n?: number) {
  if (n === undefined) return '—';
  return `${n.toLocaleString('vi-VN')} VND`;
}

function statusBadge(status: string) {
  const color =
    status === 'PUBLISHED'
      ? brand.success
      : status === 'PENDING_REVIEW'
        ? brand.warning
        : status === 'REJECTED'
          ? brand.destructive
          : brand.muted;
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: color }}>
      {status}
    </span>
  );
}

export function AdminModerationPage() {
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchListings('PENDING_REVIEW');
      setListings(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được hàng đợi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove(listingId: string) {
    setBusyId(listingId);
    setError(null);
    try {
      const res = await approveListing(listingId);
      setToast(`Đã publish ${res.data.id} — hiển thị trên public search`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve thất bại');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(listingId: string) {
    const reason = rejectReason[listingId]?.trim() || 'Nội dung chưa đạt chuẩn';
    setBusyId(listingId);
    setError(null);
    try {
      await rejectListing(listingId, reason, 'MODERATION_REJECT');
      setToast(`Đã từ chối ${listingId}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject thất bại');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell
      title="Moderation queue"
      subtitle="UC-GR-03 · UC-LS-02 · SCR-ADMIN-016 · UAT-02"
      screenTag="Admin / Ops Portal"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm" style={{ color: brand.muted }}>
          Chờ duyệt: <strong>{listings.length}</strong>
        </p>
        <div className="flex gap-3 text-sm">
          <Link to="/agent/listings/new" className="underline" style={{ color: brand.primary }}>
            Agent wizard
          </Link>
          <Link to="/public/search" className="underline" style={{ color: brand.primary }}>
            Public search
          </Link>
          <button type="button" className="underline" onClick={() => void load()}>
            Làm mới
          </button>
        </div>
      </div>

      {toast && (
        <p
          className="mb-4 text-sm rounded-lg p-3"
          style={{ background: '#ECFDF5', color: brand.success, border: `1px solid ${brand.success}` }}
        >
          {toast}
        </p>
      )}

      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEF2F2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải…</p>
      ) : listings.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center space-y-2"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <p className="font-medium">Không có listing PENDING_REVIEW</p>
          <p className="text-sm" style={{ color: brand.muted }}>
            Agent tạo listing tại{' '}
            <Link to="/agent/listings/new" className="underline">
              /agent/listings/new
            </Link>{' '}
            và bấm Gửi duyệt.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {listings.map((row) => {
            const a = row.attributes;
            const drift = a.driftReport;
            const blocked = a.antiDriftStatus === 'BLOCK';

            return (
              <li
                key={row.id}
                className="rounded-xl p-5 space-y-4"
                style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs" style={{ color: brand.muted }}>
                      {row.id} · {a.unitCode ?? a.unitId}
                    </p>
                    <h3 className="text-lg font-semibold">{a.title}</h3>
                    <p className="text-sm mt-1 line-clamp-2" style={{ color: brand.muted }}>
                      {a.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {statusBadge(a.status)}
                    <span className="text-sm font-medium">{formatVnd(a.priceDisplay)}</span>
                    <span className="text-xs" style={{ color: brand.muted }}>
                      GR: {formatVnd(a.basePrice)}
                    </span>
                  </div>
                </div>

                <DriftPanel
                  report={
                    drift
                      ? {
                          status: drift.status ?? a.antiDriftStatus as 'PASS' | 'FLAG' | 'BLOCK',
                          findings: drift.findings ?? [],
                          unitCode: drift.unitCode ?? a.unitCode,
                          basePrice: drift.basePrice ?? a.basePrice,
                        }
                      : {
                          status: a.antiDriftStatus as 'PASS' | 'FLAG' | 'BLOCK',
                          findings: [],
                          basePrice: a.basePrice,
                          unitCode: a.unitCode,
                        }
                  }
                />

                <div className="flex flex-wrap gap-3 items-end">
                  <button
                    type="button"
                    disabled={busyId === row.id || blocked}
                    onClick={() => void handleApprove(row.id)}
                    className="rounded-xl px-5 py-2.5 font-semibold text-white disabled:opacity-50"
                    style={{ background: brand.success }}
                  >
                    Approve → Publish
                  </button>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs" style={{ color: brand.muted }}>
                      Lý do từ chối
                    </label>
                    <input
                      value={rejectReason[row.id] ?? ''}
                      onChange={(e) =>
                        setRejectReason((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      placeholder="VD: Sai giá, thiếu ảnh…"
                      className="w-full h-9 px-3 rounded-lg border text-sm mt-0.5"
                      style={{ borderColor: brand.border }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void handleReject(row.id)}
                    className="rounded-xl px-5 py-2.5 font-semibold text-white"
                    style={{ background: brand.destructive }}
                  >
                    Reject
                  </button>
                </div>
                {blocked && (
                  <p className="text-xs" style={{ color: brand.destructive }}>
                    BLOCK — không thể approve (UAT-04). Yêu cầu agent sửa giá khớp GR.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
