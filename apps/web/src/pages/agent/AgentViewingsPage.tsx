import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import { fetchViewings, patchViewing, type ViewingRecord } from '../../lib/api';
import { brand } from '../../theme/tokens';

const OUTCOMES = [
  { code: 'COMPLETED_INTERESTED', label: 'Quan tâm' },
  { code: 'COMPLETED_NEEDS_OPTIONS', label: 'Cần thêm lựa chọn' },
  { code: 'PRICE_OBJECTION', label: 'Vướng giá' },
  { code: 'NO_SHOW_CUSTOMER', label: 'Khách vắng' },
  { code: 'CANCELED', label: 'Hủy' },
];

export function AgentViewingsPage() {
  const [rows, setRows] = useState<ViewingRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchViewings();
      setRows(res.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được lịch xem nhà');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirm(id: string) {
    setBusyId(id);
    try {
      await patchViewing(id, { status: 'CONFIRMED' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không cập nhật được');
    } finally {
      setBusyId(null);
    }
  }

  async function completeChecklist(id: string) {
    setBusyId(id);
    try {
      await patchViewing(id, {
        checklist: {
          customer_id_verified: true,
          unit_condition_walked: true,
          budget_confirmed: true,
          next_step_agreed: true,
        },
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checklist thất bại');
    } finally {
      setBusyId(null);
    }
  }

  async function setOutcome(id: string, outcome: string) {
    setBusyId(id);
    try {
      await patchViewing(id, {
        outcome,
        checklist: {
          customer_id_verified: true,
          unit_condition_walked: true,
          budget_confirmed: true,
          next_step_agreed: true,
        },
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không cập nhật được');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AgentShell title="Lịch xem nhà" subtitle="FR-VIEW — request, confirm, outcome" screenTag="SCR-AGENT-VIEW">
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="overflow-x-auto nnhn-card" style={{ background: brand.surface }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs" style={{ color: brand.muted }}>
              <th className="p-3">Lead</th>
              <th className="p-3">Căn / slot</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t" style={{ borderColor: brand.border }}>
                <td className="p-3">
                  <Link to={`/agent/leads/${row.attributes.leadId}`} className="font-semibold underline">
                    {row.attributes.leadId}
                  </Link>
                </td>
                <td className="p-3 text-xs">
                  {row.attributes.unitId ?? '—'}
                  <br />
                  {row.attributes.requestedSlot
                    ? new Date(row.attributes.requestedSlot).toLocaleString('vi-VN')
                    : row.attributes.mode}
                </td>
                <td className="p-3 text-xs font-bold">{row.attributes.status}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {row.attributes.status === 'REQUESTED' && (
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        className="rounded px-2 py-1 text-xs text-white"
                        style={{ background: brand.primary }}
                        onClick={() => void confirm(row.id)}
                      >
                        Xác nhận
                      </button>
                    )}
                    {(row.attributes.status === 'CONFIRMED' || row.attributes.status === 'COMPLETED') && (
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        className="rounded px-2 py-1 text-xs"
                        style={{ background: brand.accentSoft, color: brand.primaryDark }}
                        onClick={() => void completeChecklist(row.id)}
                      >
                        Checklist ✓
                      </button>
                    )}
                    {OUTCOMES.map((o) => (
                      <button
                        key={o.code}
                        type="button"
                        disabled={busyId === row.id}
                        className="rounded px-2 py-1 text-xs border"
                        style={{ borderColor: brand.border }}
                        onClick={() => void setOutcome(row.id, o.code)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 text-sm" style={{ color: brand.muted }}>Chưa có lịch xem nhà.</p>}
      </div>
    </AgentShell>
  );
}
