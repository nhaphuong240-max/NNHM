import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import {
  fetchSmsIntegrationStatus,
  sendSmsMessage,
  simulateSmsDelivery,
  type SmsIntegrationStatus,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

export function AdminSmsIntegrationPage() {
  const [status, setStatus] = useState<SmsIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [phone, setPhone] = useState('+84901234567');
  const [smsMessage, setSmsMessage] = useState('Sunrise Tower — cọc đã nhận (demo)');

  const graphModeLabel =
    status?.graphMode === 'LIVE'
      ? 'Provider LIVE'
      : status?.graphMode === 'UNCONFIGURED'
        ? 'Chưa cấu hình API key'
        : 'Sandbox (dev default)';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSmsIntegrationStatus();
      setStatus(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải SMS integration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSimulate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await simulateSmsDelivery({ phone, message: smsMessage });
      setMessage(
        `SMS ${res.deliveryId} · ${res.status}${res.idempotentReplay ? ' (replay)' : ''}${res.otp ? ` · OTP ${res.otp}` : ''}`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulate thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await sendSmsMessage({ phone, params: { message: smsMessage } });
      setMessage(`Sent ${res.deliveryId} · ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gửi SMS thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="SMS Gateway"
      subtitle="UC-NW-03 · SCR-ADMIN-012 · OTP + transaction notify"
      screenTag="Admin / Integrations"
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link to="/admin" className="underline" style={{ color: brand.primary }}>
          ← Dashboard
        </Link>
        <Link to="/admin/integrations/zalo" className="underline" style={{ color: brand.muted }}>
          Zalo ZNS
        </Link>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: brand.muted }}>
          Đang tải…
        </p>
      ) : status ? (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div
              className="rounded-xl p-4"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                Mode
              </p>
              <p className="text-lg font-bold mt-1">{graphModeLabel}</p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                Sent
              </p>
              <p className="text-2xl font-bold mt-1 tabular-nums">{status.stats.sent}</p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                Failed
              </p>
              <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: brand.destructive }}>
                {status.stats.failed}
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm rounded-lg p-3" style={{ background: '#ECFDF5', color: brand.success }}>
              {message}
            </p>
          )}

          <section
            className="rounded-xl p-5 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold">Simulate outbound (pilot)</h3>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border text-sm"
              style={{ borderColor: brand.border }}
              placeholder="SĐT"
            />
            <input
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border text-sm"
              style={{ borderColor: brand.border }}
              placeholder="Nội dung"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSimulate()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: brand.primary }}
              >
                Simulate SMS
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSend()}
                className="rounded-lg px-4 py-2 text-sm font-semibold border disabled:opacity-50"
                style={{ borderColor: brand.border }}
              >
                Send manual
              </button>
            </div>
            <p className="text-xs" style={{ color: brand.muted }}>
              Templates: {status.templates.join(', ')} · Payment OTP hook gửi khi tạo payment intent
            </p>
          </section>

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold mb-3">Recent deliveries</h3>
            {status.recentDeliveries.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chưa có SMS. Tạo payment intent hoặc simulate ở trên.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {status.recentDeliveries.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap justify-between gap-2 border-b pb-2"
                    style={{ borderColor: brand.border }}
                  >
                    <span className="font-mono">{d.id}</span>
                    <span>{d.templateId}</span>
                    <span>{d.phone}</span>
                    <span className="font-bold">{d.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
