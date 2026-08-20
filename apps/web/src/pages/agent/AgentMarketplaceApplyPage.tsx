import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import {
  fetchAgencyApplications,
  fetchMarketplaceProjects,
  submitAgencyApplication,
  type AgencyApplicationRecord,
  type MarketplaceProjectRecord,
} from '../../lib/api';
import { AGENCY_TENANT_ID } from '../../lib/constants';
import { brand } from '../../theme/tokens';

export function AgentMarketplaceApplyPage() {
  const [projects, setProjects] = useState<MarketplaceProjectRecord[]>([]);
  const [applications, setApplications] = useState<AgencyApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [marketRes, appRes] = await Promise.all([
        fetchMarketplaceProjects(),
        fetchAgencyApplications(),
      ]);
      setProjects(marketRes.data);
      setApplications(appRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải marketplace');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApply(project: MarketplaceProjectRecord) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await submitAgencyApplication({
        developerTenantId: project.developerTenantId,
        projectId: project.projectId,
        distributionPolicyId: project.distributionPolicyId,
        message: `Apply quyền bán ${project.projectName} — pilot agency`,
      });
      setMessage(
        res.meta?.idempotentReplay
          ? `Đã apply trước đó · ${res.data.attributes.status}`
          : `Đã gửi apply ${res.data.id} · chờ developer duyệt`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apply thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AgentShell
      title="Marketplace — Apply quyền bán"
      subtitle="UC-MKT-02 · Cross-tenant · Agency tenant"
      screenTag="Agent / Marketplace"
    >
      <div className="mb-4 text-sm rounded-lg p-3" style={{ background: '#EFF6FF', color: brand.primary }}>
        Demo agency tenant: <code className="font-mono">{AGENCY_TENANT_ID}</code> · login{' '}
        <code className="font-mono">agency@sunrise-realty.vn</code> / Agency123!
      </div>

      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải…</p>
      ) : (
        <div className="space-y-6">
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
            <h2 className="font-semibold">Dự án mở phân phối</h2>
            {projects.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chưa có project published — developer publish policy tại{' '}
                <Link to="/developer/distribution" className="underline">
                  /developer/distribution
                </Link>
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {projects.map((p) => (
                  <div
                    key={`${p.developerTenantId}:${p.projectId}`}
                    className="rounded-lg p-4 space-y-2"
                    style={{ background: brand.background, border: `1px solid ${brand.border}` }}
                  >
                    <p className="font-bold">{p.projectName}</p>
                    <p className="text-xs" style={{ color: brand.muted }}>
                      {p.developerName} · {p.projectCode} · {p.policyName}
                    </p>
                    {p.terms.summary && (
                      <p className="text-xs" style={{ color: brand.muted }}>
                        {p.terms.summary}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-xs font-bold">
                        {p.applicationStatus ?? 'Chưa apply'}
                      </span>
                      {!p.applicationStatus && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleApply(p)}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          style={{ background: brand.primary }}
                        >
                          Apply quyền bán
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold mb-3">Đơn của agency</h2>
            {applications.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chưa có application
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {applications.map((app) => (
                  <li key={app.id} className="flex flex-wrap justify-between gap-2 border-b pb-2" style={{ borderColor: brand.border }}>
                    <span className="font-mono">{app.id}</span>
                    <span>{app.attributes.projectName ?? app.attributes.projectId}</span>
                    <span className="font-bold">{app.attributes.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AgentShell>
  );
}
