import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import {
  escalateHotLead,
  fetchBookings,
  fetchCrmToday,
  fetchHotConversion,
  fetchLeads,
  type LeadRecord,
} from '../../lib/api';
import { getSession } from '../../lib/auth';
import { brand } from '../../theme/tokens';
import {
  formatRelativeTime,
  hasPendingScoring,
  HOT_SCORE_MIN,
  isHotLead,
  isOverdue,
  PENDING_POLL_MS,
  SLA_HOURS,
  tierColor,
} from './agentLeadUi';

function KpiCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string | number;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: highlight ? brand.accentSoft : brand.surface,
        border: `1px solid ${highlight ? brand.accent : brand.border}`,
      }}
    >
      <p className="text-xs" style={{ color: brand.muted }}>
        {label}
      </p>
      <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: brand.primary }}>
        {value}
      </p>
      {hint && (
        <p className="text-xs mt-1" style={{ color: brand.muted }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function QuickLink({ to, label, desc }: { to: string; label: string; desc: string }) {
  return (
    <Link
      to={to}
      className="rounded-2xl p-4 block transition-transform hover:-translate-y-0.5"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <p className="font-semibold text-sm" style={{ color: brand.primaryDark }}>
        {label}
      </p>
      <p className="text-xs mt-1" style={{ color: brand.muted }}>
        {desc}
      </p>
    </Link>
  );
}

export function AgentHomePage() {
  const session = getSession();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [hotConversionRate, setHotConversionRate] = useState<number | null>(null);
  const [hotResponseSlaMs, setHotResponseSlaMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState<{
    slaApplicable: boolean;
    hotFirstTouchMinutes: number;
    overdueCount: number;
    queue: Array<{
      id: string;
      attributes: { fullName: string; phone: string };
      countdownMs?: number | null;
      overdue?: boolean;
    }>;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, bookingsRes, hotRes, todayRes] = await Promise.all([
        fetchLeads(),
        fetchBookings({ limit: 50 }).catch(() => ({ data: [], meta: { count: 0 } })),
        fetchHotConversion().catch(() => null),
        fetchCrmToday().catch(() => null),
      ]);
      setLeads(leadsRes.data);
      setBookingCount(bookingsRes.data.length);
      if (hotRes?.data) {
        setHotConversionRate(hotRes.data.hotConversionRate);
        setHotResponseSlaMs(hotRes.data.hotResponseSlaMs);
      }
      if (todayRes?.data?.attributes) {
        const a = todayRes.data.attributes;
        setToday({
          slaApplicable: a.slaApplicable,
          hotFirstTouchMinutes: a.hotFirstTouchMinutes,
          overdueCount: a.overdueCount,
          queue: a.queue as Array<{
            id: string;
            attributes: { fullName: string; phone: string };
            countdownMs?: number | null;
            overdue?: boolean;
          }>,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const scoringPending = useMemo(() => hasPendingScoring(leads), [leads]);

  useEffect(() => {
    if (!scoringPending) return;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetchLeads();
        setLeads(res.data);
      } catch {
        /* silent poll */
      }
    }, PENDING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [scoringPending]);

  const stats = useMemo(() => {
    const hot = leads.filter(isHotLead);
    const active = leads.filter((l) => !['WON', 'LOST'].includes(l.attributes.status));
    const overdue = leads.filter(isOverdue);
    const newToday = leads.filter((l) => {
      const ref = l.attributes.updatedAt;
      if (!ref) return false;
      return Date.now() - new Date(ref).getTime() < 24 * 60 * 60 * 1000;
    });
    return { hot, active, overdue, newToday };
  }, [leads]);

  const hotSorted = useMemo(
    () => [...stats.hot].sort((a, b) => b.attributes.score - a.attributes.score),
    [stats.hot],
  );

  const greeting = session?.email?.split('@')[0] ?? 'Agent';

  return (
    <AgentShell
      title="Agent Portal"
      subtitle={`UC-CRM-05 · FR-UX-02 · ${session?.email ?? '—'}`}
      screenTag="Agent / Dashboard"
    >
      <p className="text-sm mb-6" style={{ color: brand.muted }}>
        Xin chào, <strong style={{ color: brand.ink }}>{greeting}</strong> · Bắt đầu ngày tại{' '}
        <Link to="/agent/inbox" className="underline font-semibold" style={{ color: brand.primary }}>
          Inbox đa kênh
        </Link>{' '}
        (OPS-S4 · lead Zalo/web)
      </p>

      {loading && <p style={{ color: brand.muted }}>Đang tải KPI…</p>}
      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="space-y-8">
          {today && (
            <section
              className="rounded-2xl p-5 space-y-4"
              style={{ background: brand.accentSoft, border: `1px solid ${brand.accent}` }}
            >
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">Today — HOT ≤ {today.hotFirstTouchMinutes} phút</h2>
                <span className="text-xs" style={{ color: brand.muted }}>
                  {today.slaApplicable ? 'Giờ hành chính' : 'Ngoài giờ SLA (SLA_NOT_APPLICABLE)'}
                </span>
              </div>
              {today.queue.length === 0 ? (
                <p className="text-sm" style={{ color: brand.muted }}>
                  Không có HOT trong hàng đợi.
                </p>
              ) : (
                <ul className="space-y-2">
                  {today.queue.slice(0, 5).map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-sm"
                      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                    >
                      <div>
                        <p className="font-medium">{row.attributes.fullName}</p>
                        <p className="text-xs" style={{ color: brand.muted }}>
                          {row.attributes.phone}
                          {row.countdownMs != null && (
                            <> · còn {Math.max(0, Math.ceil(row.countdownMs / 60000))} phút</>
                          )}
                          {row.overdue && <> · <strong style={{ color: brand.destructive }}>Quá hạn</strong></>}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: brand.primary, color: '#fff' }}
                        onClick={() => void escalateHotLead(row.id).then(() => load())}
                      >
                        Escalate
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="Tổng lead" value={leads.length} hint={`${stats.newToday.length} cập nhật 24h`} />
            <KpiCard label="Hot lead" value={stats.hot.length} hint={`score ≥ ${HOT_SCORE_MIN}`} highlight />
            <KpiCard
              label="HOT conversion"
              value={hotConversionRate != null ? `${Math.round(hotConversionRate * 100)}%` : '—'}
              hint={
                hotResponseSlaMs != null
                  ? `SLA phản hồi ${Math.round(hotResponseSlaMs / 60000)} phút`
                  : 'TC-12 funnel'
              }
            />
            <KpiCard label="Pipeline active" value={stats.active.length} hint="chưa WON/LOST" />
            <KpiCard label="Booking" value={bookingCount} hint="tenant scope" />
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Lead nóng ưu tiên</h2>
              <Link to="/agent/leads?tier=HOT" className="text-sm underline" style={{ color: brand.primary }}>
                Xem tất cả →
              </Link>
            </div>
            {hotSorted.length === 0 ? (
              <p className="text-sm rounded-xl p-6 text-center" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
                Chưa có hot lead · kiểm tra pipeline hoặc import CSV.
              </p>
            ) : (
              <div className="space-y-2">
                {hotSorted.slice(0, 5).map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
                    style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded text-white shrink-0"
                        style={{ background: tierColor(lead.attributes.tier) }}
                      >
                        {lead.attributes.score}
                      </span>
                      <div>
                        <p className="font-medium">{lead.attributes.fullName}</p>
                        <p className="text-xs" style={{ color: brand.muted }}>
                          {lead.attributes.unitId ?? '—'} ·{' '}
                          {formatRelativeTime(lead.attributes.lastActivityAt ?? lead.attributes.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`tel:${lead.attributes.phone}`}
                        className="text-xs rounded-lg border px-3 py-1.5"
                        style={{ borderColor: brand.border }}
                      >
                        Gọi
                      </a>
                      <Link
                        to={`/agent/leads/${encodeURIComponent(lead.id)}`}
                        className="text-xs rounded-lg px-3 py-1.5 text-white font-semibold"
                        style={{ background: brand.primary }}
                      >
                        Chi tiết
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {stats.overdue.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">SLA cần follow-up ({SLA_HOURS}h)</h2>
                <Link to="/agent/tasks/sla" className="text-sm underline" style={{ color: brand.primary }}>
                  SLA board →
                </Link>
              </div>
              <ul className="space-y-2 text-sm">
                {stats.overdue.slice(0, 4).map((lead) => (
                  <li key={lead.id}>
                    <Link
                      to={`/agent/leads/${encodeURIComponent(lead.id)}`}
                      className="underline"
                      style={{ color: brand.destructive }}
                    >
                      {lead.attributes.fullName}
                    </Link>
                    <span style={{ color: brand.muted }}> · {lead.attributes.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="font-semibold mb-3">Điều hướng nhanh</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <QuickLink to="/agent/inbox" label="Inbox (P0)" desc="OPS-S4 · Zalo · Meta · web — mở mỗi sáng" />
              <QuickLink to="/agent/tasks/sla" label="SLA tasks" desc="UC-CRM-06 · remind · escalate" />
              <QuickLink to="/agent/contracts/new" label="Hợp đồng template" desc="UC-BK-06 · merge booking" />
              <QuickLink to="/agent/leads" label="Lead list" desc="UC-CRM-03 · filter · search" />
              <QuickLink to="/agent/pipeline" label="Pipeline kanban" desc="SCR-AGENT-014 · drag stage" />
              <QuickLink to="/agent/bookings/new" label="Tạo booking" desc="SCR-AGENT-005" />
              <QuickLink to="/agent/listings/new" label="Listing wizard" desc="SCR-AGENT-011" />
              <QuickLink to="/agent/settings/routing" label="Routing HOT" desc="SCR-AGENT-015" />
              <QuickLink to="/agent/ai/legal" label="Legal RAG" desc="UC-AI-03 · tra cứu pháp lý" />
              <QuickLink to="/agent/ai/reply" label="AI reply" desc="UC-AI-04 · draft & gửi" />
            </div>
            <p className="text-xs mt-2" style={{ color: brand.muted }}>
              Import CSV: Advanced nav → Import CSV (không thay Inbox omni).
            </p>
          </section>
        </div>
      )}
    </AgentShell>
  );
}
