import { Injectable } from '@nestjs/common';
import {
  defaultPermissionMatrix,
  permissionCatalog,
  permissionsForTenantRole,
  roleCatalog,
  type RoleDefinition,
  type TenantRole,
} from './role-catalog';

export type ProjectScopeRule = {
  role: TenantRole;
  projectIds: string[];
};

export type TenantRolePolicy = {
  projectScopes: ProjectScopeRule[];
  permissionMatrix: Record<TenantRole, string[]>;
  updatedAt: string;
};

const DEFAULT_PROJECT_SCOPES: ProjectScopeRule[] = [
  { role: 'DEVELOPER_ADMIN', projectIds: ['prj_sunrise'] },
  { role: 'AGENT', projectIds: ['prj_sunrise'] },
  { role: 'OPS_ADMIN', projectIds: ['prj_sunrise'] },
];

@Injectable()
export class RoleService {
  private readonly policies = new Map<string, TenantRolePolicy>();

  getCatalog(tenantId?: string): { data: RoleDefinition[]; meta: { count: number; tenantId?: string } } {
    const matrix = tenantId ? this.getPolicy(tenantId).data.permissionMatrix : undefined;
    const data = roleCatalog(matrix);
    return { data, meta: { count: data.length, tenantId } };
  }

  getPermissionCatalog(): { data: ReturnType<typeof permissionCatalog>; meta: { count: number } } {
    const data = permissionCatalog();
    return { data, meta: { count: data.length } };
  }

  getPolicy(tenantId: string): { data: TenantRolePolicy; meta: { tenantId: string } } {
    const existing = this.policies.get(tenantId);
    const data =
      existing ??
      ({
        projectScopes: DEFAULT_PROJECT_SCOPES.map((row) => ({
          ...row,
          projectIds: [...row.projectIds],
        })),
        permissionMatrix: defaultPermissionMatrix(),
        updatedAt: new Date(0).toISOString(),
      } satisfies TenantRolePolicy);
    return { data, meta: { tenantId } };
  }

  getPermissionsForRole(tenantId: string, role: string): string[] {
    const policy = this.getPolicy(tenantId).data;
    if (role in policy.permissionMatrix) {
      return [...policy.permissionMatrix[role as TenantRole]];
    }
    return permissionsForTenantRole(role);
  }

  updatePolicy(
    tenantId: string,
    input: {
      projectScopes?: ProjectScopeRule[];
      permissionMatrix?: Partial<Record<TenantRole, string[]>>;
    },
  ): { data: TenantRolePolicy; meta: { tenantId: string } } {
    const current = this.getPolicy(tenantId).data;
    const permissionMatrix = { ...current.permissionMatrix };

    if (input.permissionMatrix) {
      for (const [role, perms] of Object.entries(input.permissionMatrix) as [TenantRole, string[]][]) {
        if (role in permissionMatrix) {
          permissionMatrix[role] = [...new Set(perms)];
        }
      }
    }

    const data: TenantRolePolicy = {
      projectScopes: (input.projectScopes ?? current.projectScopes).map((row) => ({
        role: row.role,
        projectIds: [...new Set(row.projectIds)],
      })),
      permissionMatrix,
      updatedAt: new Date().toISOString(),
    };
    this.policies.set(tenantId, data);
    return { data, meta: { tenantId } };
  }
}
