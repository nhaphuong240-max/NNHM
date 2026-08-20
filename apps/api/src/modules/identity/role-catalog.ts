/** UC-ID-02 — tenant role catalog + permission matrix (SCR-ADMIN-021) */
export const TENANT_ROLES = [
  'ADMIN',
  'OPS_ADMIN',
  'DEVELOPER_ADMIN',
  'AGENT',
  'FINANCE_ADMIN',
] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];

export type RoleDefinition = {
  id: TenantRole;
  label: string;
  description: string;
  permissions: string[];
};

const PERMISSION_MATRIX: Record<TenantRole, string[]> = {
  ADMIN: [
    'portal.read',
    'iam.users.read',
    'iam.roles.manage',
    'listings.moderate',
    'audit.read',
    'disputes.manage',
    'analytics.read',
  ],
  OPS_ADMIN: [
    'portal.read',
    'iam.users.read',
    'listings.moderate',
    'audit.read',
    'disputes.manage',
    'bookings.replay',
  ],
  DEVELOPER_ADMIN: [
    'portal.read',
    'gr.units.read',
    'gr.units.write',
    'iam.users.read',
    'commission.manage',
    'analytics.read',
  ],
  AGENT: [
    'portal.read',
    'gr.units.read',
    'listings.write',
    'bookings.write',
    'leads.read',
  ],
  FINANCE_ADMIN: [
    'portal.read',
    'ledger.read',
    'reconciliation.run',
    'refunds.write',
    'commission.export',
  ],
};

export function roleCatalog(): RoleDefinition[] {
  return TENANT_ROLES.map((id) => ({
    id,
    label: ROLE_LABELS[id],
    description: ROLE_DESCRIPTIONS[id],
    permissions: PERMISSION_MATRIX[id],
  }));
}

export function permissionsForTenantRole(role: string): string[] {
  if ((TENANT_ROLES as readonly string[]).includes(role)) {
    return PERMISSION_MATRIX[role as TenantRole];
  }
  return ['portal.read'];
}

export function isValidTenantRole(role: string): role is TenantRole {
  return (TENANT_ROLES as readonly string[]).includes(role);
}

const ROLE_LABELS: Record<TenantRole, string> = {
  ADMIN: 'Platform / Tenant Admin',
  OPS_ADMIN: 'Ops Admin',
  DEVELOPER_ADMIN: 'Developer Admin',
  AGENT: 'Sales Agent',
  FINANCE_ADMIN: 'Finance Admin',
};

const ROLE_DESCRIPTIONS: Record<TenantRole, string> = {
  ADMIN: 'Full tenant administration · moderation · audit',
  OPS_ADMIN: 'Moderation · disputes · booking replay evidence',
  DEVELOPER_ADMIN: 'Golden Record · commission · developer analytics',
  AGENT: 'Listings · bookings · CRM pipeline',
  FINANCE_ADMIN: 'Ledger · reconciliation · refunds · commission export',
};
