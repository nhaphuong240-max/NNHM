import { Injectable } from '@nestjs/common';
import type { RoleDefinition, TenantRole } from './role-catalog';
import { roleCatalog } from './role-catalog';

export type ProjectScopeRule = {
  role: TenantRole;
  projectIds: string[];
};

export type TenantRolePolicy = {
  projectScopes: ProjectScopeRule[];
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

  getCatalog(): { data: RoleDefinition[]; meta: { count: number } } {
    const data = roleCatalog();
    return { data, meta: { count: data.length } };
  }

  getPolicy(tenantId: string): { data: TenantRolePolicy; meta: { tenantId: string } } {
    const existing = this.policies.get(tenantId);
    const data =
      existing ??
      ({
        projectScopes: DEFAULT_PROJECT_SCOPES.map((row) => ({ ...row, projectIds: [...row.projectIds] })),
        updatedAt: new Date(0).toISOString(),
      } satisfies TenantRolePolicy);
    return { data, meta: { tenantId } };
  }

  updatePolicy(
    tenantId: string,
    input: { projectScopes: ProjectScopeRule[] },
  ): { data: TenantRolePolicy; meta: { tenantId: string } } {
    const data: TenantRolePolicy = {
      projectScopes: input.projectScopes.map((row) => ({
        role: row.role,
        projectIds: [...new Set(row.projectIds)],
      })),
      updatedAt: new Date().toISOString(),
    };
    this.policies.set(tenantId, data);
    return { data, meta: { tenantId } };
  }
}
