import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCompareBasket } from '../../hooks/useCompareBasket';
import {
  compareQueryString,
  MAX_COMPARE_UNITS,
  parseCompareQuery,
} from '../../lib/compare';
import { fetchUnitDetail, searchUnits, type SearchHit, type UnitDetail } from '../../lib/api';
import { brand, formatPrice } from '../../theme/tokens';

type CompareUnit = {
  id: string;
  detail: UnitDetail['data'];
};

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

function pickDirection(highlights: string[]) {
  const hit = highlights.find((h) => /hướng|huong|view/i.test(h));
  return hit ?? (highlights[0] ? highlights[0] : '—');
}

function cellDiff(values: string[]): boolean {
  return new Set(values).size > 1;
}

export function PublicComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { ids, remove, replace, clear } = useCompareBasket();
  const [units, setUnits] = useState<CompareUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerHits, setPickerHits] = useState<SearchHit[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = parseCompareQuery(searchParams.get('ids'));
    if (fromQuery.length > 0) {
      replace(fromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const query = compareQueryString(ids);
    if (query) setSearchParams({ ids: query }, { replace: true });
    else setSearchParams({}, { replace: true });
  }, [ids, setSearchParams]);

  const loadUnits = useCallback(async (unitIds: string[]) => {
    if (unitIds.length === 0) {
      setUnits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        unitIds.map(async (id) => {
          const res = await fetchUnitDetail(id);
          return { id, detail: res.data } satisfies CompareUnit;
        }),
      );
      setUnits(results);
    } catch (e) {
      setUnits([]);
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu so sánh');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUnits(ids);
  }, [ids, loadUnits]);

  useEffect(() => {
    setPickerLoading(true);
    searchUnits({})
      .then((res) => setPickerHits(res.data))
      .catch(() => setPickerHits([]))
      .finally(() => setPickerLoading(false));
  }, []);

  const rows = useMemo(() => {
    if (units.length === 0) return [];
    return [
      {
        label: 'Giá',
        values: units.map((u) => formatPrice(u.detail.attributes.priceDisplay ?? u.detail.attributes.basePrice)),
      },
      {
        label: 'Diện tích',
        values: units.map((u) => `${u.detail.attributes.area} m²`),
      },
      {
        label: 'Phòng ngủ',
        values: units.map((u) => String(u.detail.attributes.bedrooms)),
      },
      {
        label: 'Tầng',
        values: units.map((u) => String(u.detail.attributes.floor)),
      },
      {
        label: 'Hướng / highlight',
        values: units.map((u) => pickDirection(u.detail.attributes.highlights)),
      },
      {
        label: 'Verified',
        values: units.map((u) => (u.detail.attributes.verified ? '✓ Có' : '—')),
      },
      {
        label: 'Trạng thái',
        values: units.map((u) => statusLabel(u.detail.attributes.unitStatus).text),
      },
      {
        label: 'Anti-drift',
        values: units.map((u) => u.detail.attributes.antiDriftStatus),
      },
    ];
  }, [units]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || ids.length === 0) return '';
    return `${window.location.origin}/public/compare?ids=${compareQueryString(ids)}`;
  }, [ids]);

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMsg('Đã copy link so sánh vào clipboard.');
    } catch {
      setCopyMsg(shareUrl);
    }
  }

  const availableToAdd = pickerHits.filter((hit) => !ids.includes(hit.id));

  return (
    <div className="min-h-screen" style={{ background: brand.background }}>
      <header className="text-white px-4 py-4" style={{ background: brand.primary }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs opacity-80">UC-LS-03 · SCR-PUBLIC-002 · FR-LS-04</p>
            <h1 className="text-xl font-bold">So sánh căn hộ</h1>
            <p className="text-sm opacity-80 mt-0.5">Tối đa {MAX_COMPARE_UNITS} căn · BR-LS-05 published · BR-LS-06</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/public/search" className="underline opacity-90">
              Tìm kiếm
            </Link>
            <Link to="/" className="underline opacity-90">
              Trang chủ
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
        <section
          className="rounded-xl p-4 space-y-3"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-sm">Danh sách so sánh ({ids.length}/{MAX_COMPARE_UNITS})</h2>
            {ids.length > 0 && (
              <button
                type="button"
                className="text-xs rounded-lg border px-3 py-1.5 font-medium"
                style={{ borderColor: brand.primary, color: brand.primary }}
                onClick={() => void copyShareLink()}
              >
                Copy share link
              </button>
            )}
            {ids.length > 0 && (
              <button
                type="button"
                className="text-xs underline"
                style={{ color: brand.destructive }}
                onClick={clear}
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {copyMsg && (
            <p className="text-xs rounded-lg p-2 break-all" style={{ background: '#EFF6FF', color: brand.primary }}>
              {copyMsg}
            </p>
          )}

          {ids.length === 0 ? (
            <p className="text-sm" style={{ color: brand.muted }}>
              Chưa có căn nào. Thêm từ kết quả tìm kiếm hoặc trang chi tiết — tối đa {MAX_COMPARE_UNITS} căn.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ids.map((id) => {
                const unit = units.find((u) => u.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-mono"
                    style={{ background: '#EFF6FF', border: `1px solid ${brand.primary}` }}
                  >
                    {unit?.detail.attributes.code ?? id}
                    <button
                      type="button"
                      aria-label={`Xóa ${id}`}
                      className="font-bold"
                      style={{ color: brand.destructive }}
                      onClick={() => remove(id)}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {ids.length < MAX_COMPARE_UNITS && (
            <div className="pt-2 border-t" style={{ borderColor: brand.border }}>
              <p className="text-xs font-medium mb-2" style={{ color: brand.muted }}>
                Thêm căn từ listing đã publish
              </p>
              {pickerLoading ? (
                <p className="text-xs" style={{ color: brand.muted }}>Đang tải listing…</p>
              ) : availableToAdd.length === 0 ? (
                <p className="text-xs" style={{ color: brand.muted }}>
                  Không còn listing khả dụng —{' '}
                  <Link to="/public/search" className="underline" style={{ color: brand.primary }}>
                    mở tìm kiếm
                  </Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableToAdd.slice(0, 8).map((hit) => (
                    <button
                      key={hit.id}
                      type="button"
                      className="rounded-lg border px-3 py-1.5 text-xs hover:shadow-sm"
                      style={{ borderColor: brand.border, background: brand.background }}
                      onClick={() => replace([...ids, hit.id])}
                    >
                      + {hit.attributes.code}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {loading && <p className="text-sm" style={{ color: brand.muted }}>Đang tải bảng so sánh…</p>}
        {error && (
          <p className="rounded-lg p-3 text-sm" style={{ background: '#FEE2E2', color: brand.destructive }}>
            {error}
          </p>
        )}

        {!loading && ids.length === 1 && (
          <p className="text-sm rounded-xl p-4" style={{ background: '#FFFBEB', color: brand.warning }}>
            Cần thêm ít nhất <strong>1 căn nữa</strong> để hiển thị bảng so sánh side-by-side.
          </p>
        )}

        {!loading && units.length >= 2 && (
          <section
            className="rounded-xl overflow-x-auto"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: brand.border, background: brand.background }}>
                  <th className="text-left p-4 font-medium w-36" />
                  {units.map((u) => (
                    <th key={u.id} className="p-4 text-left align-top">
                      <p className="font-semibold">{u.detail.attributes.code}</p>
                      <p className="text-xs font-normal mt-1" style={{ color: brand.muted }}>
                        {u.detail.attributes.projectName}
                      </p>
                      <p className="text-xs font-normal mt-0.5 line-clamp-2">{u.detail.attributes.title}</p>
                      <button
                        type="button"
                        className="text-xs underline mt-2"
                        style={{ color: brand.destructive }}
                        onClick={() => remove(u.id)}
                      >
                        Gỡ khỏi so sánh
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const diff = cellDiff(row.values);
                  return (
                    <tr key={row.label} className="border-b" style={{ borderColor: brand.border }}>
                      <td className="p-4 font-medium" style={{ color: brand.muted }}>
                        {row.label}
                      </td>
                      {row.values.map((value, idx) => (
                        <td
                          key={`${row.label}-${idx}`}
                          className="p-4"
                          style={{
                            background: diff ? '#FFFBEB' : undefined,
                            fontWeight: diff ? 600 : undefined,
                          }}
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr>
                  <td className="p-4" />
                  {units.map((u) => {
                    const sold = u.detail.attributes.unitStatus === 'SOLD';
                    const status = statusLabel(u.detail.attributes.unitStatus);
                    return (
                      <td key={u.id} className="p-4 align-top space-y-2">
                        {sold && (
                          <span
                            className="inline-block text-xs font-bold px-2 py-0.5 rounded text-white"
                            style={{ background: status.color }}
                          >
                            {status.text} — CTA tắt
                          </span>
                        )}
                        <Link
                          to={`/public/units/${u.id}`}
                          className={`block text-center rounded-xl py-2.5 text-sm font-semibold text-white ${
                            sold ? 'pointer-events-none opacity-40' : ''
                          }`}
                          style={{ background: brand.primary }}
                          aria-disabled={sold}
                          onClick={(e) => {
                            if (sold) e.preventDefault();
                          }}
                        >
                          Đăng ký tư vấn
                        </Link>
                        <Link
                          to={`/public/units/${u.id}`}
                          className="block text-center text-xs underline"
                          style={{ color: brand.primary }}
                        >
                          Xem chi tiết
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </section>
        )}

        <p className="text-xs" style={{ color: brand.muted }}>
          Share compare link: dùng nút <strong>Copy share link</strong> · URL{' '}
          <code className="font-mono">?ids=</code> · Frontend-only —{' '}
          <code className="font-mono">GET /search/units/:id</code> cho từng cột.
        </p>
      </main>
    </div>
  );
}
