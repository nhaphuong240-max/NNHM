import { Fragment, useMemo } from 'react';
import type { PermissionDefinition, RoleDefinition } from '../../lib/api';
import { brand } from '../../theme/tokens';

type PermissionMatrixPanelProps = {
  roles: RoleDefinition[];
  permissions: PermissionDefinition[];
  matrix: Record<string, string[]>;
  selectedRole: string;
  onSelectRole: (roleId: string) => void;
  onToggle: (roleId: string, permissionId: string) => void;
  showFullMatrix: boolean;
  onToggleFullMatrix: () => void;
};

function groupPermissions(permissions: PermissionDefinition[]) {
  const groups = new Map<string, PermissionDefinition[]>();
  for (const perm of permissions) {
    const list = groups.get(perm.group) ?? [];
    list.push(perm);
    groups.set(perm.group, list);
  }
  return [...groups.entries()];
}

export function PermissionMatrixPanel({
  roles,
  permissions,
  matrix,
  selectedRole,
  onSelectRole,
  onToggle,
  showFullMatrix,
  onToggleFullMatrix,
}: PermissionMatrixPanelProps) {
  const grouped = useMemo(() => groupPermissions(permissions), [permissions]);
  const selectedRoleDef = roles.find((r) => r.id === selectedRole);
  const selectedPerms = new Set(matrix[selectedRole] ?? []);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: brand.muted }}>
          Chọn chức vụ
        </p>
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => {
            const active = role.id === selectedRole;
            const count = matrix[role.id]?.length ?? 0;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => onSelectRole(role.id)}
                className="rounded-full px-4 py-2 text-sm border transition-colors"
                style={{
                  borderColor: active ? brand.primary : brand.border,
                  background: active ? '#EFF6FF' : brand.surface,
                  color: active ? brand.primaryDark : brand.ink,
                  fontWeight: active ? 600 : 500,
                }}
              >
                {role.label}
                <span className="ml-2 text-xs tabular-nums" style={{ color: brand.muted }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {selectedRoleDef && (
          <p className="text-xs mt-3" style={{ color: brand.muted }}>
            <span className="font-mono">{selectedRoleDef.id}</span> — {selectedRoleDef.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-sm" style={{ color: brand.ink }}>
          Quyền theo chức vụ · {selectedRoleDef?.label}
        </h3>
        <button
          type="button"
          onClick={onToggleFullMatrix}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border"
          style={{ borderColor: brand.border, color: brand.primaryDark, background: brand.surface }}
        >
          {showFullMatrix ? 'Thu gọn ma trận' : 'Xem toàn ma trận'}
        </button>
      </div>

      {!showFullMatrix && (
        <div className="space-y-4">
          {grouped.map(([group, rows]) => (
            <section
              key={group}
              className="rounded-xl p-4"
              style={{ background: brand.background, border: `1px solid ${brand.border}` }}
            >
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: brand.muted }}>
                {group}
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {rows.map((perm) => (
                  <label
                    key={perm.id}
                    className="flex items-start gap-2 text-sm rounded-lg p-2 cursor-pointer hover:bg-white/60"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={selectedPerms.has(perm.id)}
                      onChange={() => onToggle(selectedRole, perm.id)}
                    />
                    <span>
                      <span className="font-medium">{perm.label}</span>
                      <span className="block text-[11px] font-mono mt-0.5" style={{ color: brand.muted }}>
                        {perm.id}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {showFullMatrix && (
        <div
          className="rounded-xl overflow-auto"
          style={{ border: `1px solid ${brand.border}`, maxHeight: '520px' }}
        >
          <table className="w-full text-xs border-collapse min-w-[720px]">
            <thead>
              <tr style={{ background: brand.background }}>
                <th
                  className="text-left px-3 py-2 sticky left-0 z-10 min-w-[200px]"
                  style={{ background: brand.background, color: brand.muted }}
                >
                  Quyền
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className="px-2 py-2 text-center font-medium min-w-[88px]"
                    style={{
                      color: role.id === selectedRole ? brand.primary : brand.muted,
                      background: role.id === selectedRole ? '#EFF6FF' : brand.background,
                    }}
                  >
                    <span className="block">{role.label}</span>
                    <span className="font-mono text-[10px] font-normal">{role.id}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(([group, rows]) => (
                <Fragment key={group}>
                  <tr>
                    <td
                      colSpan={roles.length + 1}
                      className="px-3 py-1.5 font-bold uppercase tracking-wide text-[10px]"
                      style={{ background: brand.surface, color: brand.muted }}
                    >
                      {group}
                    </td>
                  </tr>
                  {rows.map((perm) => (
                    <tr key={perm.id} className="border-t" style={{ borderColor: brand.border }}>
                      <td
                        className="px-3 py-2 sticky left-0 z-10"
                        style={{ background: brand.surface }}
                      >
                        <p className="font-medium">{perm.label}</p>
                        <p className="font-mono text-[10px]" style={{ color: brand.muted }}>
                          {perm.id}
                        </p>
                      </td>
                      {roles.map((role) => {
                        const checked = (matrix[role.id] ?? []).includes(perm.id);
                        return (
                          <td
                            key={role.id}
                            className="text-center px-2 py-2"
                            style={{
                              background: role.id === selectedRole ? '#F8FAFC' : undefined,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              aria-label={`${perm.label} · ${role.label}`}
                              onChange={() => onToggle(role.id, perm.id)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
