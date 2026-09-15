import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PermissionMatrixPanel } from '../../components/admin/PermissionMatrixPanel';
import { AdminShell } from '../../components/AdminShell';
import {
  fetchGrProjects,
  fetchPermissionCatalog,
  fetchRoleCatalog,
  fetchRolePolicy,
  fetchUsers,
  patchRolePolicy,
  patchUserRole,
  type GrProject,
  type PermissionDefinition,
  type RoleDefinition,
  type UserRecord,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

type AdminTab = 'matrix' | 'users' | 'projects';

export function AdminUserRolesPage() {
  const [tab, setTab] = useState<AdminTab>('matrix');
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [projects, setProjects] = useState<GrProject[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<Record<string, string[]>>({});
  const [policyRoles, setPolicyRoles] = useState<Record<string, string[]>>({});
  const [selectedRole, setSelectedRole] = useState<string>('ADMIN');
  const [showFullMatrix, setShowFullMatrix] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, permRes, usersRes, policyRes, projectsRes] = await Promise.all([
        fetchRoleCatalog(),
        fetchPermissionCatalog(),
        fetchUsers(),
        fetchRolePolicy(),
        fetchGrProjects(),
      ]);
      setRoles(catalogRes.data);
      setPermissions(permRes.data);
      setUsers(usersRes.data);
      setProjects(projectsRes.data);
      setPermissionMatrix({ ...policyRes.data.permissionMatrix });
      const map: Record<string, string[]> = {};
      for (const row of policyRes.data.projectScopes) {
        map[row.role] = [...row.projectIds];
      }
      setPolicyRoles(map);
      if (catalogRes.data[0]) {
        setSelectedRole((current) =>
          catalogRes.data.some((r) => r.id === current) ? current : catalogRes.data[0].id,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải phân quyền');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const projectScopePayload = useMemo(
    () =>
      Object.entries(policyRoles).map(([role, projectIds]) => ({
        role,
        projectIds,
      })),
    [policyRoles],
  );

  function togglePermission(roleId: string, permissionId: string) {
    setPermissionMatrix((prev) => {
      const current = new Set(prev[roleId] ?? []);
      if (current.has(permissionId)) current.delete(permissionId);
      else current.add(permissionId);
      return { ...prev, [roleId]: [...current] };
    });
  }

  function toggleProject(role: string, projectId: string) {
    setPolicyRoles((prev) => {
      const current = new Set(prev[role] ?? []);
      if (current.has(projectId)) current.delete(projectId);
      else current.add(projectId);
      return { ...prev, [role]: [...current] };
    });
  }

  async function saveMatrix() {
    setBusy('matrix');
    setError(null);
    setMessage(null);
    try {
      await patchRolePolicy({ permissionMatrix });
      setMessage('Đã lưu ma trận quyền theo chức vụ.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu ma trận thất bại');
    } finally {
      setBusy(null);
    }
  }

  async function saveProjectPolicy() {
    setBusy('policy');
    setError(null);
    setMessage(null);
    try {
      await patchRolePolicy({ projectScopes: projectScopePayload });
      setMessage('Đã lưu phạm vi dự án (ABAC).');
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
      setMessage(`Đã gán chức vụ ${role} cho user.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gán chức vụ thất bại');
    } finally {
      setBusy(null);
    }
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'matrix', label: 'Ma trận quyền' },
    { id: 'users', label: 'Gán user' },
    { id: 'projects', label: 'Phạm vi dự án' },
  ];

  return (
    <AdminShell
      title="Phân quyền ma trận"
      subtitle="UC-ID-02 · SCR-ADMIN-021 · Chức vụ × quyền × dự án"
      screenTag="Admin / Identity"
    >
      <Link to="/admin/users" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← User directory
      </Link>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className="rounded-full px-4 py-2 text-sm font-medium border"
            style={{
              borderColor: tab === item.id ? brand.primary : brand.border,
              background: tab === item.id ? brand.primary : brand.surface,
              color: tab === item.id ? '#fff' : brand.ink,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

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

      {!loading && tab === 'matrix' && (
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <PermissionMatrixPanel
            roles={roles}
            permissions={permissions}
            matrix={permissionMatrix}
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            onToggle={togglePermission}
            showFullMatrix={showFullMatrix}
            onToggleFullMatrix={() => setShowFullMatrix((v) => !v)}
          />
          <button
            type="button"
            disabled={busy === 'matrix'}
            onClick={() => void saveMatrix()}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: brand.primary }}
          >
            {busy === 'matrix' ? 'Đang lưu…' : 'Lưu ma trận quyền'}
          </button>
        </section>
      )}

      {!loading && tab === 'users' && (
        <section
          className="rounded-xl p-5"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <h2 className="font-semibold mb-1">Gán chức vụ cho user</h2>
          <p className="text-xs mb-4" style={{ color: brand.muted }}>
            Mỗi user có một chức vụ chính — quyền lấy từ ma trận tương ứng.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: brand.muted }}>
                  <th className="pb-2">User</th>
                  <th className="pb-2">Chức vụ hiện tại</th>
                  <th className="pb-2">Đổi chức vụ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roleDef = roles.find((r) => r.id === user.attributes.role);
                  return (
                    <tr key={user.id} className="border-t" style={{ borderColor: brand.border }}>
                      <td className="py-2">
                        <p>{user.attributes.email}</p>
                        <p className="font-mono text-xs" style={{ color: brand.muted }}>
                          {user.id}
                        </p>
                      </td>
                      <td className="py-2">
                        <p className="font-medium">{roleDef?.label ?? user.attributes.role}</p>
                        <p className="font-mono text-xs" style={{ color: brand.muted }}>
                          {user.attributes.role}
                        </p>
                      </td>
                      <td className="py-2">
                        <select
                          defaultValue={user.attributes.role}
                          disabled={busy === user.id}
                          className="rounded-lg border px-2 py-1 text-xs min-w-[160px]"
                          style={{ borderColor: brand.border }}
                          onChange={(e) => void assignRole(user.id, e.target.value)}
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && tab === 'projects' && (
        <section
          className="rounded-xl p-5"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <h2 className="font-semibold mb-1">ABAC — phạm vi dự án theo chức vụ</h2>
          <p className="text-xs mb-4" style={{ color: brand.muted }}>
            Chọn dự án Golden Record mà từng chức vụ được truy cập (stub in-memory · UC-ID-02).
          </p>
          {roles.map((role) => (
            <div key={role.id} className="mb-4 pb-4 border-b last:border-0" style={{ borderColor: brand.border }}>
              <p className="text-sm font-medium mb-2">
                {role.label}{' '}
                <span className="font-mono text-xs font-normal" style={{ color: brand.muted }}>
                  {role.id}
                </span>
              </p>
              {projects.length === 0 ? (
                <p className="text-xs" style={{ color: brand.muted }}>
                  Chưa có dự án — tạo tại Developer → Dự án.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {projects.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-xs rounded-lg px-2 py-1 border" style={{ borderColor: brand.border }}>
                      <input
                        type="checkbox"
                        checked={(policyRoles[role.id] ?? []).includes(p.id)}
                        onChange={() => toggleProject(role.id, p.id)}
                      />
                      <span>
                        {p.attributes.name}
                        <span className="block font-mono text-[10px]" style={{ color: brand.muted }}>
                          {p.id}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            disabled={busy === 'policy'}
            onClick={() => void saveProjectPolicy()}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: brand.primary }}
          >
            {busy === 'policy' ? 'Đang lưu…' : 'Lưu phạm vi dự án'}
          </button>
        </section>
      )}
    </AdminShell>
  );
}
