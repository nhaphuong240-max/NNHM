import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import { RoutingSuggestionsPanel } from '../../components/agent/RoutingSuggestionsPanel';
import { fetchRoutingRules, patchRoutingRules, type RoutingRules } from '../../lib/api';
import { brand } from '../../theme/tokens';

export function AgentRoutingSettingsPage() {
  const [rules, setRules] = useState<RoutingRules['attributes'] | null>(null);
  const [hotScore, setHotScore] = useState(85);
  const [enabled, setEnabled] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);
  const [maxOpenLeads, setMaxOpenLeads] = useState(15);
  const [skillTags, setSkillTags] = useState('high-rise');
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
      setRequireApproval(res.data.attributes.requireHumanApproval !== false);
      setMaxOpenLeads(res.data.attributes.maxOpenLeads ?? 15);
      setSkillTags((res.data.attributes.skillTags ?? []).join(', '));
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
        requireHumanApproval: requireApproval,
        maxOpenLeads,
        skillTags: skillTags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        strategy: 'PARTNER_SCORE_AGING',
      });
      setRules(res.data.attributes);
      setMessage('Đã lưu routing rules (DB persist · Phase B)');
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
              />
              Yêu cầu duyệt người trước assign (P2)
            </label>

            <label className="block text-sm">
              <span className="font-medium">Max open leads / agent</span>
              <input
                type="number"
                min={1}
                max={100}
                value={maxOpenLeads}
                onChange={(e) => setMaxOpenLeads(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                style={{ borderColor: brand.border }}
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium">Skill tags (comma)</span>
              <input
                type="text"
                value={skillTags}
                onChange={(e) => setSkillTags(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                style={{ borderColor: brand.border }}
                placeholder="high-rise, sunrise"
              />
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
                  <li key={a.id} className="text-xs border-b py-2" style={{ borderColor: brand.border }}>
                    <div className="flex justify-between gap-2">
                      <span>{a.email}</span>
                      <span style={{ color: brand.muted }}>open {a.openLeadCount ?? 0}</span>
                    </div>
                    <p className="font-mono mt-0.5" style={{ color: brand.muted }}>
                      {a.id} · score {a.partnerScore ?? '—'} · {(a.skillTags ?? []).join(', ') || '—'}
                    </p>
                  </li>
                ))
              )}
            </ul>
            <p className="text-xs mt-3" style={{ color: brand.muted }}>
              Partner score + aging tồn kho (P2 FR-REV-002). Duyệt suggestion trước khi assign.
            </p>
          </section>

          <RoutingSuggestionsPanel />
        </div>
      )}
    </AgentShell>
  );
}
