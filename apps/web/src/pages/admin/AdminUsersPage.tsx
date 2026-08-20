import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import { fetchUsers, type UserRecord } from '../../lib/api';
import { getSession } from '../../lib/auth';
import { brand } from '../../theme/tokens';

function StatusBadge({ status }: { status: UserRecord['attributes']['status'] }) {
  const active = status === 'ACTIVE';
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded text-white"
      style={{ background: active ? brand.success : brand.muted }}
    >
      {status}
    </span>
  );
}

function RoleChip({ role }: { role: string }) {
  return (
    <span
      className="text-xs font-mono px-2 py-0.5 rounded"
      style={{ background: '#EFF6FF', color: '#1D4ED8' }}
    >
      {role}
    </span>
  );
}

export function AdminUsersPage() {
  const session = getSession();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUsers();
      setUsers(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      title="Quản lý user"
      subtitle="UC-ID-04 · SCR-ADMIN-020 · Tenant-scoped directory"
      screenTag="Admin / Identity"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="text-sm" style={{ color: brand.muted }}>
          Tenant: <strong className="font-mono">{session?.tenantId ?? '—'}</strong> ·{' '}
          <strong>{users.length}</strong> user
        </div>
        <div className="flex gap-3 text-sm">
          <Link to="/admin/tenants/onboard" className="underline" style={{ color: brand.primary }}>
            Onboard tenant
          </Link>
          <Link to="/admin/users/roles" className="underline" style={{ color: brand.primary }}>
            Roles & ABAC
          </Link>
          <button type="button" className="underline" onClick={() => void load()}>
            Làm mới
          </button>
        </div>
      </div>

      <p
        className="mb-4 text-sm rounded-lg p-3"
        style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }}
      >
        Invite user, đổi role và deactivate sẽ có khi API <code className="font-mono">POST/PATCH /users</code>{' '}
        triển khai (S2). Hiện hiển thị directory read-only từ seed.
      </p>

      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải…</p>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <table className="w-full text-sm">
            <thead style={{ background: brand.background }}>
              <tr>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">User ID</th>
                <th className="text-left p-3 font-medium">Tạo lúc</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center" style={{ color: brand.muted }}>
                    Không có user trong tenant
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t" style={{ borderColor: brand.border }}>
                    <td className="p-3 font-medium">{u.attributes.email}</td>
                    <td className="p-3">
                      <RoleChip role={u.attributes.role} />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={u.attributes.status} />
                    </td>
                    <td className="p-3 font-mono text-xs">{u.id}</td>
                    <td className="p-3 text-xs tabular-nums" style={{ color: brand.muted }}>
                      {new Intl.DateTimeFormat('vi-VN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(u.attributes.createdAt))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <section className="mt-8 grid sm:grid-cols-2 gap-4">
        <div
          className="rounded-xl p-4 opacity-60"
          style={{ background: brand.surface, border: `1px dashed ${brand.border}` }}
        >
          <h3 className="font-semibold text-sm">Invite user</h3>
          <p className="text-xs mt-1" style={{ color: brand.muted }}>
            POST /users/invite · S2
          </p>
        </div>
        <div
          className="rounded-xl p-4 opacity-60"
          style={{ background: brand.surface, border: `1px dashed ${brand.border}` }}
        >
          <h3 className="font-semibold text-sm">RBAC editor</h3>
          <p className="text-xs mt-1" style={{ color: brand.muted }}>
            SCR-ADMIN-021 · UC-ID-02 · S2
          </p>
        </div>
      </section>
    </AdminShell>
  );
}
