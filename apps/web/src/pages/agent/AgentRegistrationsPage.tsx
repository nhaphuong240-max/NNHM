import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AgentShell } from '../../components/AgentShell';
import {
  fetchLeadRegistrations,
  openDealDispute,
  registerLeadCustomer,
  type LeadRegistrationRecord,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

const RESULT_LABEL: Record<string, string> = {
  ACCEPTED: 'Đã bảo vệ',
  EXISTING_PROTECTED: 'Đã thuộc sàn khác',
  EXISTING_ELIGIBLE: 'Bạn đang bảo vệ khách này',
};

export function AgentRegistrationsPage() {
  const [rows, setRows] = useState<LeadRegistrationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [projectId, setProjectId] = useState('prj_sunrise');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchLeadRegistrations();
      setRows(res.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải registry');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setToast(null);
    try {
      const res = await registerLeadCustomer({ fullName, phone, projectId, intent: 'buy' });
      setToast(RESULT_LABEL[res.meta.result] ?? res.meta.result);
      setFullName('');
      setPhone('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AgentShell
      title="Đăng ký khách"
      subtitle="Deal protection 30 ngày · không lộ PII sàn khác"
      screenTag="SCR-AGENT-REG"
    >
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {toast && (
        <p className="text-sm mb-3 font-semibold" style={{ color: brand.primary }}>
          {toast}
        </p>
      )}
      <form onSubmit={onSubmit} className="nnhn-card p-4 mb-6 grid sm:grid-cols-4 gap-3" style={{ background: brand.surface }}>
        <input
          required
          placeholder="Họ tên"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: brand.border }}
        />
        <input
          required
          placeholder="SĐT"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: brand.border }}
        />
        <input
          required
          placeholder="Mã dự án"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: brand.border }}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg py-2 text-sm font-bold text-white"
          style={{ background: brand.clay }}
        >
          Đăng ký
        </button>
      </form>
      <div className="overflow-x-auto nnhn-card" style={{ background: brand.surface }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs" style={{ color: brand.muted }}>
              <th className="p-3">Khách</th>
              <th className="p-3">Dự án</th>
              <th className="p-3">Bảo vệ đến</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Dispute</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t" style={{ borderColor: brand.border }}>
                <td className="p-3">
                  {row.attributes.fullName}
                  <p className="text-xs font-mono" style={{ color: brand.muted }}>
                    {row.attributes.phone}
                  </p>
                </td>
                <td className="p-3 text-xs">{row.attributes.projectId}</td>
                <td className="p-3 text-xs">
                  {new Date(row.attributes.protectedUntil).toLocaleDateString('vi-VN')}
                </td>
                <td className="p-3 text-xs font-bold">{row.attributes.status}</td>
                <td className="p-3">
                  {row.attributes.fullName === '••••' && (
                    <button
                      type="button"
                      className="text-xs font-semibold underline"
                      style={{ color: brand.clay }}
                      onClick={() =>
                        void openDealDispute(row.id, 'Tranh chấp bảo vệ khách').then(() => {
                          setToast('Đã mở dispute — Ops xử lý trong 5 ngày làm việc');
                          void load();
                        })
                      }
                    >
                      Mở dispute
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AgentShell>
  );
}
