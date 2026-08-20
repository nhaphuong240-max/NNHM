import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AICopilotPanel } from '../../components/AICopilotPanel';
import { AgentShell } from '../../components/AgentShell';
import { DriftPanel } from '../../components/DriftPanel';
import {
  checkListingDrift,
  createListing,
  fetchGrUnits,
  submitListingReview,
  type DriftCheckResult,
  type GrUnit,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

function formatVnd(n: number) {
  return `${n.toLocaleString('vi-VN')} VND`;
}

export function AgentListingWizardPage() {
  const [units, setUnits] = useState<GrUnit[]>([]);
  const [unitId, setUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [drift, setDrift] = useState<DriftCheckResult['data'] | null>(null);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [checkingDrift, setCheckingDrift] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ listingId: string; submitted: boolean } | null>(null);
  const [aiUsed, setAiUsed] = useState(false);
  const [aiApproved, setAiApproved] = useState(false);

  const selected = units.find((u) => u.id === unitId);

  useEffect(() => {
    fetchGrUnits('AVAILABLE')
      .then((res) => {
        setUnits(res.data);
        if (res.data[0]) {
          setUnitId(res.data[0].id);
          setPriceDisplay(String(res.data[0].attributes.basePrice));
          setTitle(`Căn ${res.data[0].attributes.bedrooms}PN · ${res.data[0].attributes.code}`);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được danh sách unit'))
      .finally(() => setLoadingUnits(false));
  }, []);

  const runDriftCheck = useCallback(
    async (uid: string, price: number) => {
      if (!uid || !Number.isFinite(price)) return;
      setCheckingDrift(true);
      try {
        const res = await checkListingDrift({ unitId: uid, priceDisplay: price });
        setDrift(res.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Drift check failed');
      } finally {
        setCheckingDrift(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!unitId) return;
    const price = Number(priceDisplay.replace(/\D/g, ''));
    const unit = units.find((u) => u.id === unitId);
    if (unit && !priceDisplay) {
      setPriceDisplay(String(unit.attributes.basePrice));
    }
    const t = window.setTimeout(() => {
      if (Number.isFinite(price) && price > 0) {
        void runDriftCheck(unitId, price);
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [unitId, priceDisplay, units, runDriftCheck]);

  async function handleCreate(submit: boolean) {
    if (!unitId || !title.trim() || !description.trim()) {
      setError('Vui lòng chọn unit và nhập tiêu đề + mô tả.');
      return;
    }
    if (aiUsed && !aiApproved) {
      setError('FR-AI-04: Cần tick human approve nội dung AI trước khi lưu/gửi.');
      return;
    }
    const price = Number(priceDisplay.replace(/\D/g, ''));
    if (!Number.isFinite(price) || price <= 0) {
      setError('Giá hiển thị không hợp lệ.');
      return;
    }
    if (submit && drift?.status === 'BLOCK') {
      setError('Không thể gửi duyệt — anti-drift BLOCK (UAT-04).');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const created = await createListing({
        unitId,
        title: title.trim(),
        description: description.trim(),
        priceDisplay: price,
        highlights: ['View đẹp', 'Gần metro'],
      });

      let submitted = false;
      if (submit) {
        await submitListingReview(created.data.id);
        submitted = true;
      }

      setSuccess({ listingId: created.data.id, submitted });
      setDrift(created.data.attributes.driftReport ?? drift);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo listing thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AgentShell
      title="Tạo listing mới"
      subtitle="UC-GR-02 · UC-AI-01 · SCR-AGENT-011 · UAT-02 / UAT-04"
      screenTag="Agent / Listing Wizard"
    >
      <Link
        to="/agent/listings/media"
        className="text-sm underline mb-4 inline-block"
        style={{ color: brand.primary }}
      >
        Quản lý media gallery (SCR-AGENT-010) →
      </Link>
      {loadingUnits ? (
        <p style={{ color: brand.muted }}>Đang tải Golden Record…</p>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <section
              className="rounded-xl p-5 space-y-4"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <h2 className="font-semibold">Bước 1 — Chọn unit (GR)</h2>
              <select
                value={unitId}
                onChange={(e) => {
                  const id = e.target.value;
                  setUnitId(id);
                  const u = units.find((x) => x.id === id);
                  if (u) {
                    setPriceDisplay(String(u.attributes.basePrice));
                    setTitle(`Căn ${u.attributes.bedrooms}PN · ${u.attributes.code}`);
                  }
                  setSuccess(null);
                  setAiUsed(false);
                  setAiApproved(false);
                }}
                className="w-full h-10 px-3 rounded-lg border text-sm"
                style={{ borderColor: brand.border }}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.attributes.code} · {u.attributes.bedrooms}PN · {formatVnd(u.attributes.basePrice)}
                  </option>
                ))}
              </select>
              {selected && (
                <p className="text-sm" style={{ color: brand.muted }}>
                  GR giá gốc (read-only):{' '}
                  <strong style={{ color: brand.primary }}>{formatVnd(selected.attributes.basePrice)}</strong>
                  {' · '}
                  {selected.attributes.area} m² · tầng {selected.attributes.floor ?? '—'}
                </p>
              )}
            </section>

            <section
              className="rounded-xl p-5 space-y-4"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <h2 className="font-semibold">Bước 2 — Nội dung marketing</h2>
              <div>
                <label className="text-sm font-medium">Tiêu đề *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-lg border text-sm"
                  style={{ borderColor: brand.border }}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mô tả *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Mô tả căn hộ cho buyer…"
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: brand.border }}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Giá hiển thị (VND) *</label>
                <input
                  value={priceDisplay}
                  onChange={(e) => setPriceDisplay(e.target.value.replace(/[^\d]/g, ''))}
                  className="w-full mt-1 h-10 px-3 rounded-lg border text-sm font-mono"
                  style={{ borderColor: brand.border }}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded border"
                    style={{ borderColor: brand.border }}
                    onClick={() => selected && setPriceDisplay(String(selected.attributes.basePrice))}
                  >
                    Khớp GR (PASS)
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded border"
                    style={{ borderColor: brand.warning, color: brand.warning }}
                    onClick={() => selected && setPriceDisplay(String(Math.round(selected.attributes.basePrice * 1.06)))}
                  >
                    +6% (FLAG demo)
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded border"
                    style={{ borderColor: brand.destructive, color: brand.destructive }}
                    onClick={() => setPriceDisplay('4500000000')}
                  >
                    4.5 tỷ (BLOCK · UAT-04)
                  </button>
                </div>
              </div>
            </section>

            {error && (
              <p className="text-sm rounded-lg p-3" style={{ background: '#FEF2F2', color: brand.destructive }}>
                {error}
              </p>
            )}

            {success && (
              <div
                className="rounded-xl p-4 space-y-2 text-sm"
                style={{ background: '#ECFDF5', border: `1px solid ${brand.success}` }}
              >
                <p className="font-semibold" style={{ color: brand.success }}>
                  {success.submitted ? 'Đã gửi duyệt!' : 'Đã lưu nháp.'} Listing {success.listingId}
                </p>
                {success.submitted ? (
                  <p>
                    Ops admin duyệt tại{' '}
                    <Link to="/admin/moderation" className="underline font-medium">
                      /admin/moderation
                    </Link>
                  </p>
                ) : null}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCreate(false)}
                className="rounded-xl px-5 py-2.5 font-semibold border"
                style={{ borderColor: brand.border, background: brand.surface }}
              >
                Lưu nháp
              </button>
              <button
                type="button"
                disabled={busy || drift?.status === 'BLOCK'}
                onClick={() => void handleCreate(true)}
                className="rounded-xl px-5 py-2.5 font-semibold text-white disabled:opacity-50"
                style={{ background: brand.primary }}
              >
                Gửi duyệt →
              </button>
            </div>
          </div>

          <aside className="space-y-3">
            <AICopilotPanel
              unitId={unitId}
              priceDisplay={Number(priceDisplay.replace(/\D/g, '')) || undefined}
              disabled={loadingUnits || busy}
              onApply={({ title: aiTitle, description: aiDescription }) => {
                setTitle(aiTitle);
                setDescription(aiDescription);
                setError(null);
              }}
              onUsedChange={(used, approved) => {
                setAiUsed(used);
                setAiApproved(approved);
              }}
            />
            <DriftPanel
              report={
                drift
                  ? {
                      status: drift.status,
                      findings: drift.findings,
                      checkedAt: drift.checkedAt,
                      unitCode: drift.unitCode,
                      basePrice: drift.basePrice,
                    }
                  : null
              }
            />
            {checkingDrift && (
              <p className="text-xs" style={{ color: brand.muted }}>
                Đang kiểm tra anti-drift…
              </p>
            )}
            <p className="text-xs" style={{ color: brand.muted }}>
              UAT-04 · OP-WIN-04: giá lệch &gt;10% so với GR → BLOCK, không gửi duyệt.
            </p>
            {drift?.status === 'BLOCK' && (
              <div
                className="rounded-lg p-3 text-xs space-y-2"
                style={{ background: '#FEF2F2', border: `1px solid ${brand.destructive}` }}
              >
                <p className="font-semibold" style={{ color: brand.destructive }}>
                  UAT-04 BLOCK — chỉnh giá về GR hoặc cập nhật Golden Record trước khi gửi duyệt.
                </p>
                <p>
                  Ops duyệt listing hợp lệ tại{' '}
                  <Link to="/admin/moderation" className="underline font-medium">
                    /admin/moderation
                  </Link>
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
    </AgentShell>
  );
}
