import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import { fetchAdminDashboard, type AdminDashboardData } from '../../lib/api';
import { brand, formatPercent } from '../../theme/tokens';

const FUNNEL_STAGES = [
  { key: 'NEW', label: 'Mới' },
  { key: 'CONTACTED', label: 'Liên hệ' },
  { key: 'VIEWING', label: 'Xem nhà' },
  { key: 'NEGOTIATING', label: 'Đàm phán' },
  { key: 'BOOKING', label: 'Booking' },
  { key: 'WON', label: 'Thắng' },
] as const;

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
      className="rounded-xl p-4"
      style={{
        background: highlight ? '#FEF3C7' : brand.surface,
        border: `1px solid ${highlight ? brand.warning : brand.border}`,
      }}
    >
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: brand.muted }}>
        {label}
      </p>
      <p className="text-2xl font-bold mt-2 tabular-nums" style={{ color: '#334155' }}>
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
      className="block rounded-xl p-4 hover:shadow-sm transition-shadow"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <p className="font-semibold" style={{ color: brand.primary }}>
        {label}
      </p>
      <p className="text-xs mt-1" style={{ color: brand.muted }}>
        {desc}
      </p>
    </Link>
  );
}

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetchAdminDashboard();
    setData(res.data);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Không tải được dashboard');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  const attrs = data?.attributes;
  const maxFunnel = FUNNEL_STAGES.reduce(
    (max, s) => Math.max(max, attrs?.leadsByStatus[s.key] ?? 0),
    1,
  );

  return (
    <AdminShell
      title="Dashboard Platform"
      subtitle="UC-AN-01 · UC-UX-03 · SCR-ADMIN-001"
      screenTag="Admin / Ops Portal"
    >
      {loading && <p style={{ color: brand.muted }}>Đang tải KPI…</p>}
      {error && (
        <p className="rounded-lg p-3 text-sm" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {attrs && (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold mb-4" style={{ color: brand.primary }}>
              Funnel leads → cọc
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Leads" value={attrs.funnel.leads} />
              <KpiCard label="Bookings" value={attrs.funnel.bookings} />
              <KpiCard label="Đã cọc" value={attrs.funnel.deposited} highlight />
              <KpiCard
                label="Conversion"
                value={formatPercent(attrs.funnel.conversionRate)}
                hint="Cọc / Leads"
              />
            </div>
          </section>

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold mb-4">Pipeline CRM</h3>
            <div className="space-y-2">
              {FUNNEL_STAGES.map((stage) => {
                const count = attrs.leadsByStatus[stage.key] ?? 0;
                const width = Math.max(4, Math.round((count / maxFunnel) * 100));
                return (
                  <div key={stage.key} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0" style={{ color: brand.muted }}>
                      {stage.label}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: brand.border }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${width}%`, background: brand.primary }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            <section
              className="rounded-xl p-5"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Moderation queue</h3>
                <Link to="/admin/moderation" className="text-sm underline" style={{ color: brand.primary }}>
                  Xem tất cả ({attrs.moderation.pendingReview})
                </Link>
              </div>
              {attrs.pendingListings.length === 0 ? (
                <p className="text-sm" style={{ color: brand.muted }}>
                  Không có listing chờ duyệt
                </p>
              ) : (
                <div className="space-y-3">
                  {attrs.pendingListings.map((row) => (
                    <div
                      key={row.id}
                      className="flex justify-between items-start gap-3 text-sm border-b pb-2"
                      style={{ borderColor: brand.border }}
                    >
                      <div>
                        <p className="font-medium">
                          {row.unitCode} · {row.id}
                        </p>
                        <p className="text-xs" style={{ color: brand.muted }}>
                          {row.title}
                        </p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded font-bold"
                        style={{
                          background: row.antiDriftStatus === 'PASS' ? '#DCFCE7' : '#FFEDD5',
                          color: row.antiDriftStatus === 'PASS' ? brand.success : brand.warning,
                        }}
                      >
                        {row.antiDriftStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-4 mt-4 text-xs" style={{ color: brand.muted }}>
                <span>Published: {attrs.moderation.published}</span>
                <span>Draft: {attrs.moderation.draft}</span>
                <span>Rejected: {attrs.moderation.rejected}</span>
              </div>
            </section>

            <section
              className="rounded-xl p-5"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Tích hợp & Ops</h3>
                <Link
                  to="/admin/integrations/leads"
                  className="text-sm underline"
                  style={{ color: brand.primary }}
                >
                  Omnichannel hub →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs" style={{ color: brand.muted }}>
                    Meta processed
                  </p>
                  <p className="font-bold tabular-nums">{attrs.integrations.metaProcessed}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: brand.muted }}>
                    Zalo processed
                  </p>
                  <p className="font-bold tabular-nums">{attrs.integrations.zaloProcessed}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: brand.muted }}>
                    ZNS sent
                  </p>
                  <p className="font-bold tabular-nums">{attrs.integrations.znsSent}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: brand.muted }}>
                    KYC pending
                  </p>
                  <Link to="/admin/kyc" className="font-bold tabular-nums underline" style={{ color: '#334155' }}>
                    {attrs.ops.kycPending}
                  </Link>
                </div>
              </div>
              <p className="text-xs mt-4" style={{ color: brand.muted }}>
                Audit events (7 ngày): {attrs.ops.auditEvents7d}
              </p>
            </section>
          </div>

          <section>
            <h3 className="font-semibold mb-3">Điều hướng nhanh</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <QuickLink to="/admin/ops" label="Ops console" desc="OPS-S3 · 4 widget G-OPS-1" />
              <QuickLink to="/admin/tenants/onboard" label="Onboard tenant" desc="UC-ID-01 · SCR-ADMIN-019" />
              <QuickLink to="/admin/users" label="Users" desc="UC-ID-04 · Directory" />
              <QuickLink to="/admin/users/roles" label="Roles" desc="UC-ID-02 · SCR-ADMIN-021" />
              <QuickLink
                to="/admin/bookings/replay?bookingId=bk_settle01"
                label="Booking replay"
                desc="UC-BK-04 · SCR-ADMIN-006"
              />
              <QuickLink to="/admin/disputes" label="Disputes" desc="UC-TR-03 · SCR-ADMIN-008" />
              <QuickLink to="/admin/duplicates" label="Duplicates" desc="UC-LS-06 · SCR-ADMIN-009" />
              <QuickLink to="/admin/kyc" label="KYC queue" desc="UC-ID-05 · BR-23" />
              <QuickLink to="/admin/moderation" label="Moderation" desc="UC-GR-03 · Anti-drift" />
              <QuickLink to="/admin/ai/anomaly" label="AI Anomaly" desc="UC-AI-05 · SCR-ADMIN-002" />
              <QuickLink to="/admin/api-marketplace" label="API Marketplace" desc="UC-NW-04 · SCR-ADMIN-004" />
              <QuickLink to="/admin/marketplace" label="Marketplace SLA" desc="UC-MKT-04 · SCR-ADMIN-015" />
              <QuickLink to="/admin/payment-gateways" label="Payment gateways" desc="UC-PAY-05 · SCR-ADMIN-017" />
              <QuickLink to="/admin/regulatory-export" label="Regulatory export" desc="UC-TR-04 · SCR-ADMIN-018" />
              <QuickLink to="/admin/audit" label="Audit" desc="UC-TR-01 · Timeline" />
              <QuickLink
                to="/admin/commission/holdback"
                label="Holdback"
                desc="UC-COM-04 · SCR-ADMIN-007"
              />
              <QuickLink to="/admin/analytics/gmv" label="GMV report" desc="UC-AN-02 · SCR-ADMIN-003" />
              <QuickLink
                to="/admin/analytics/attribution"
                label="Attribution"
                desc="UC-AN-04 · utm_campaign / campaign_id"
              />
              <QuickLink to="/admin/integrations/leads" label="Omnichannel" desc="UC-CRM-05 · SCR-ADMIN-010" />
              <QuickLink to="/admin/integrations/zalo" label="Zalo OA" desc="UC-NW-01 · ZNS" />
              <QuickLink to="/admin/integrations/sms" label="SMS Gateway" desc="UC-NW-03 · OTP" />
              <QuickLink to="/admin/integrations/meta" label="Meta Lead Ads" desc="UC-NW-02 · TC-21" />
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
