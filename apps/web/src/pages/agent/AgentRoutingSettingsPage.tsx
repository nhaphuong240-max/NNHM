import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import { fetchRoutingRules, patchRoutingRules, type RoutingRules } from '../../lib/api';
import { brand } from '../../theme/tokens';

export function AgentRoutingSettingsPage() {
  const [rules, setRules] = useState<RoutingRules['attributes'] | null>(null);
  const [hotScore, setHotScore] = useState(85);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRoutingRules();
      setRules(res.data.attributes);
      setHotScore(res.data.attributes.hotTierMinScore);
      setEnabled(res.data.attributes.enabled);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải routing rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await patchRoutingRules({
        enabled,
        hotTierMinScore: hotScore,
      });
      setRules(res.data.attributes);
      setMessage('Đã lưu routing rules (pilot in-memory)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AgentShell
      title="Routing settings"
      subtitle="UC-CRM-02 · SCR-AGENT-015 · HOT round-robin"
      screenTag="Agent / CRM"
    >
      <div className="mb-4 text-sm">
        <Link to="/agent/pipeline" className="underline" style={{ color: brand.primary }}>
          ← Pipeline
        </Link>
      </div>

      {loading && <p style={{ color: brand.muted }}>Đang tải…</p>}
      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}
      {message && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#ECFDF5', color: brand.success }}>
          {message}
        </p>
      )}

      {rules && (
        <div className="max-w-xl space-y-6">
          <section
            className="rounded-xl p-5 space-y-4"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              Bật auto-routing HOT leads
            </label>

            <label className="block text-sm">
              <span className="font-medium">Ngưỡng HOT (score ≥)</span>
              <input
                type="number"
                min={50}
                max={100}
                value={hotScore}
                onChange={(e) => setHotScore(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                style={{ borderColor: brand.border }}
              />
            </label>

            <p className="text-xs" style={{ color: brand.muted }}>
              Strategy: <strong>{rules.strategy}</strong> · Assign when tier = {rules.assignOnTier}
            </p>

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-xl px-4 py-2.5 font-semibold text-white disabled:opacity-50"
              style={{ background: brand.primary }}
            >
              {saving ? 'Đang lưu…' : 'Lưu cấu hình'}
            </button>
          </section>

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold mb-3">Agent pool</h3>
            <ul className="space-y-2 text-sm">
              {rules.agentPool.length === 0 ? (
                <li style={{ color: brand.muted }}>Chưa có agent active</li>
              ) : (
                rules.agentPool.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2 font-mono text-xs">
                    <span>{a.email}</span>
                    <span style={{ color: brand.muted }}>{a.id}</span>
                  </li>
                ))
              )}
            </ul>
            <p className="text-xs mt-3" style={{ color: brand.muted }}>
              Round-robin gán lead HOT sau AI scoring (UC-AI-02). Skill-based routing — S2.
            </p>
          </section>
        </div>
      )}
    </AgentShell>
  );
}
