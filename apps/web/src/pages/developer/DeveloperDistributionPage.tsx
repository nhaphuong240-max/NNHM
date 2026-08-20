import { FormEvent, useCallback, useEffect, useState } from 'react';
import { DeveloperShell } from '../../components/DeveloperShell';
import {
  createDistributionPolicy,
  fetchAgencyApplications,
  fetchDistributionPolicies,
  publishDistributionPolicy,
  reviewAgencyApplication,
  type AgencyApplicationRecord,
  type DistributionPolicyRecord,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

const PROJECT_ID = 'prj_sunrise';

export function DeveloperDistributionPage() {
  const [policies, setPolicies] = useState<DistributionPolicyRecord[]>([]);
  const [applications, setApplications] = useState<AgencyApplicationRecord[]>([]);
  const [policyName, setPolicyName] = useState('Sunrise co-broker v2');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [policyRes, appRes] = await Promise.all([
        fetchDistributionPolicies(PROJECT_ID),
        fetchAgencyApplications(),
      ]);
      setPolicies(policyRes.data);
      setApplications(appRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải phân phối');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreateDraft(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createDistributionPolicy({
        projectId: PROJECT_ID,
        name: policyName,
        terms: {
          regions: ['HCM'],
          commissionTier: 'STANDARD',
          maxAgencies: 10,
          summary: 'Pilot marketplace — agency apply cross-tenant',
        },
      });
      setMessage('Draft distribution policy created');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(policyId: string) {
    setBusy(true);
    setError(null);
    try {
      await publishDistributionPolicy(policyId);
      setMessage(`Policy ${policyId} published to marketplace`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleReview(appId: string, status: 'APPROVED' | 'REJECTED') {
    setBusy(true);
    setError(null);
    try {
      await reviewAgencyApplication(appId, { status });
      setMessage(`Application ${appId} → ${status}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeveloperShell
      title="Chính sách phân phối"
      subtitle="UC-MKT-01 · Publish policy · Duyệt agency apply"
      screenTag="Developer / Distribution"
    >
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
            <h2 className="font-semibold">Publish policy — {PROJECT_ID}</h2>
            <form onSubmit={(e) => void handleCreateDraft(e)} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs block mb-1" style={{ color: brand.muted }}>
                  Tên policy
                </label>
                <input
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border text-sm"
                  style={{ borderColor: brand.border }}
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: brand.primary }}
              >
                Tạo draft
              </button>
            </form>
            <ul className="space-y-2 text-sm">
              {policies.length === 0 ? (
                <li style={{ color: brand.muted }}>Chưa có policy — seed dp_sunrise_mkt_v1 sau restart API</li>
              ) : (
                policies.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b pb-2"
                    style={{ borderColor: brand.border }}
                  >
                    <span>
                      <strong>{p.attributes.name}</strong> · v{p.attributes.version} ·{' '}
                      <span className="font-mono">{p.id}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-bold">{p.attributes.status}</span>
                      {p.attributes.status === 'DRAFT' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handlePublish(p.id)}
                          className="text-xs underline"
                          style={{ color: brand.primary }}
                        >
                          Publish
                        </button>
                      )}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold mb-3">Hàng đợi agency apply (cross-tenant)</h2>
            {applications.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chưa có đơn — agency login ten_agency_01 → /agent/marketplace/apply
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {applications.map((app) => (
                  <li
                    key={app.id}
                    className="rounded-lg p-3"
                    style={{ background: brand.background, border: `1px solid ${brand.border}` }}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-mono">{app.id}</span>
                      <span className="font-bold">{app.attributes.status}</span>
                    </div>
                    <p className="mt-1">
                      {app.attributes.agencyName ?? app.attributes.agencyTenantId} →{' '}
                      {app.attributes.projectName ?? app.attributes.projectId}
                    </p>
                    {app.attributes.message && (
                      <p className="text-xs mt-1" style={{ color: brand.muted }}>
                        {app.attributes.message}
                      </p>
                    )}
                    {app.attributes.status === 'PENDING' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleReview(app.id, 'APPROVED')}
                          className="rounded px-3 py-1 text-xs font-semibold text-white"
                          style={{ background: brand.success }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleReview(app.id, 'REJECTED')}
                          className="rounded px-3 py-1 text-xs font-semibold border"
                          style={{ borderColor: brand.border }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </DeveloperShell>
  );
}
