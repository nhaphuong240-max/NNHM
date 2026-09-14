import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PublicTopBar } from '../../components/PublicTopBar';
import { fetchOpenDays, rsvpOpenDay, type OpenDayEvent } from '../../lib/api';
import { brand } from '../../theme/tokens';

/** P1 FR-VIEW-002 — open day RSVP + QR token. */
export function PublicOpenDayPage() {
  const [params] = useSearchParams();
  const projectId = params.get('projectId') ?? undefined;
  const [events, setEvents] = useState<OpenDayEvent[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchOpenDays(projectId).then((res) => {
      setEvents(res.data);
      if (res.data[0]) setSelected(res.data[0].id);
    });
  }, [projectId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    try {
      const res = await rsvpOpenDay(selected, { fullName, phone });
      setQrToken(res.data.qrToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'RSVP thất bại');
    }
  }

  return (
    <div className="min-h-screen nnhn-paper">
      <PublicTopBar />
      <main className="max-w-lg mx-auto p-6 space-y-6">
        <h1 className="nnhn-display text-3xl" style={{ color: brand.ink }}>
          Open day
        </h1>
        {events.length === 0 && (
          <p className="text-sm" style={{ color: brand.muted }}>
            Chưa có sự kiện mở. Liên hệ agent để đăng ký xem nhà riêng.
          </p>
        )}
        {qrToken ? (
          <div className="rounded-xl p-6 text-center space-y-3" style={{ background: '#ECFDF5' }}>
            <p className="font-bold">Đã đăng ký ✓</p>
            <p className="text-xs font-mono break-all">QR: {qrToken}</p>
            <p className="text-xs" style={{ color: brand.muted }}>
              Mang mã này đến check-in — gia hạn protection khi quét thành công.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm">
              Sự kiện
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} · còn {ev.spotsLeft} chỗ
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Họ tên
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              SĐT
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-xl py-3 font-bold text-white"
              style={{ background: brand.primary }}
            >
              RSVP
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
