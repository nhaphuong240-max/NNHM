import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import {
  fetchRoleCatalog,
  fetchRolePolicy,
  fetchUsers,
  patchRolePolicy,
  patchUserRole,
  type RoleDefinition,
  type UserRecord,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

const PROJECT_OPTIONS = [{ id: 'prj_sunrise', name: 'Sunrise Tower A' }];

export function AdminUserRolesPage() {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [policyRoles, setPolicyRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, usersRes, policyRes] = await Promise.all([
        fetchRoleCatalog(),
        fetchUsers(),
        fetchRolePolicy(),
      ]);
      setRoles(catalogRes.data);
      setUsers(usersRes.data);
      const map: Record<string, string[]> = {};
      for (const row of policyRes.data.projectScopes) {
        map[row.role] = [...row.projectIds];
      }
      setPolicyRoles(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const policyPayload = useMemo(
    () =>
      Object.entries(policyRoles).map(([role, projectIds]) => ({
        role,
        projectIds,
      })),
    [policyRoles],
  );

  async function savePolicy() {
    setBusy('policy');
    setError(null);
    setMessage(null);
    try {
      await patchRolePolicy(policyPayload);
      setMessage('Đã lưu ABAC project scope.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu policy thất bại');
    } finally {
      setBusy(null);
    }
  }

  async function assignRole(userId: string, role: string) {
    setBusy(userId);
    setError(null);
    try {
      await patchUserRole(userId, role);
      setMessage(`Đã gán role ${role} cho ${userId}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gán role thất bại');
    } finally {
      setBusy(null);
    }
  }

  function toggleProject(role: string, projectId: string) {
    setPolicyRoles((prev) => {
      const current = new Set(prev[role] ?? []);
      if (current.has(projectId)) current.delete(projectId);
      else current.add(projectId);
      return { ...prev, [role]: [...current] };
    });
  }

  return (
    <AdminShell
      title="Phân quyền & Roles"
      subtitle="UC-ID-02 · SCR-ADMIN-021 · Permissions + ABAC project scope"
      screenTag="Admin / Identity"
    >
      <Link to="/admin/users" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← User directory
      </Link>

      {loading && <p style={{ color: brand.muted }}>Đang tải…</p>}
      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}
      {message && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#DCFCE7', color: brand.success }}>
          {message}
        </p>
      )}

      {!loading && (
        <div className="space-y-8">
          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold mb-4">Role catalog</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {roles.map((role) => (
                <div key={role.id} className="rounded-lg p-3 text-sm" style={{ background: brand.background }}>
                  <p className="font-semibold">{role.label}</p>
                  <p className="text-xs mt-1 font-mono" style={{ color: brand.muted }}>
                    {role.id}
                  </p>
                  <p className="text-xs mt-2">{role.description}</p>
                  <p className="text-xs mt-2" style={{ color: brand.primary }}>
                    {role.permissions.join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold mb-4">Gán role cho user</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: brand.muted }}>
                  <th className="pb-2">User</th>
                  <th className="pb-2">Role hiện tại</th>
                  <th className="pb-2">Đổi role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t" style={{ borderColor: brand.border }}>
                    <td className="py-2">
                      <p>{user.attributes.email}</p>
                      <p className="font-mono text-xs" style={{ color: brand.muted }}>
                        {user.id}
                      </p>
                    </td>
                    <td className="py-2 font-mono text-xs">{user.attributes.role}</td>
                    <td className="py-2">
                      <select
                        defaultValue={user.attributes.role}
                        disabled={busy === user.id}
                        className="rounded-lg border px-2 py-1 text-xs"
                        style={{ borderColor: brand.border }}
                        onChange={(e) => void assignRole(user.id, e.target.value)}
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.id}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold mb-2">ABAC — project scope</h2>
            <p className="text-xs mb-4" style={{ color: brand.muted }}>
              Chọn project mà từng role được truy cập (stub in-memory · UC-ID-02).
            </p>
            {roles.map((role) => (
              <div key={role.id} className="mb-3">
                <p className="text-sm font-medium mb-1">{role.id}</p>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_OPTIONS.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={(policyRoles[role.id] ?? []).includes(p.id)}
                        onChange={() => toggleProject(role.id, p.id)}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={busy === 'policy'}
              onClick={() => void savePolicy()}
              className="mt-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: brand.primary }}
            >
              Lưu policy
            </button>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
