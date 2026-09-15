/** UC-ID-02 — tenant role catalog + permission matrix (SCR-ADMIN-021) */
export const TENANT_ROLES = [
  'ADMIN',
  'OPS_ADMIN',
  'DEVELOPER_ADMIN',
  'AGENT',
  'FINANCE_ADMIN',
] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];

export type PermissionDefinition = {
  id: string;
  label: string;
  group: string;
  description?: string;
};

export type RoleDefinition = {
  id: TenantRole;
  label: string;
  description: string;
  permissions: string[];
};

/** Master permission catalog — rows of the RBAC matrix. */
export const PERMISSION_CATALOG: PermissionDefinition[] = [
  { id: 'portal.read', label: 'Truy cập portal', group: 'Portal', description: 'Đăng nhập và xem shell ứng dụng' },
  { id: 'iam.users.read', label: 'Xem danh sách user', group: 'IAM' },
  { id: 'iam.roles.manage', label: 'Quản lý ma trận quyền', group: 'IAM' },
  { id: 'gr.units.read', label: 'Xem bảng hàng GR', group: 'Golden Record' },
  { id: 'gr.units.write', label: 'Sửa giá / trạng thái GR', group: 'Golden Record' },
  { id: 'gr.projects.manage', label: 'Quản lý dự án GR', group: 'Golden Record' },
  { id: 'listings.write', label: 'Tạo / sửa listing', group: 'Listing' },
  { id: 'listings.moderate', label: 'Duyệt listing (moderation)', group: 'Listing' },
  { id: 'bookings.write', label: 'Giữ chỗ / booking', group: 'Booking' },
  { id: 'bookings.replay', label: 'Replay booking (evidence)', group: 'Booking' },
  { id: 'leads.read', label: 'Xem CRM / leads', group: 'CRM' },
  { id: 'commission.manage', label: 'Chính sách hoa hồng', group: 'Commission' },
  { id: 'commission.export', label: 'Xuất commission', group: 'Commission' },
  { id: 'ledger.read', label: 'Xem sổ cái', group: 'Finance' },
  { id: 'reconciliation.run', label: 'Chạy đối soát', group: 'Finance' },
  { id: 'refunds.write', label: 'Hoàn tiền', group: 'Finance' },
  { id: 'audit.read', label: 'Audit explorer', group: 'Ops' },
  { id: 'disputes.manage', label: 'Quản lý tranh chấp', group: 'Ops' },
  { id: 'analytics.read', label: 'Analytics / KPI', group: 'Analytics' },
];

export const PERMISSION_MATRIX: Record<TenantRole, string[]> = {
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
    'gr.projects.manage',
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

export function permissionCatalog(): PermissionDefinition[] {
  return PERMISSION_CATALOG.map((row) => ({ ...row }));
}

export function defaultPermissionMatrix(): Record<TenantRole, string[]> {
  const matrix = {} as Record<TenantRole, string[]>;
  for (const role of TENANT_ROLES) {
    matrix[role] = [...PERMISSION_MATRIX[role]];
  }
  return matrix;
}

export function roleCatalog(matrix?: Partial<Record<TenantRole, string[]>>): RoleDefinition[] {
  return TENANT_ROLES.map((id) => ({
    id,
    label: ROLE_LABELS[id],
    description: ROLE_DESCRIPTIONS[id],
    permissions: matrix?.[id] ?? PERMISSION_MATRIX[id],
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
  ADMIN: 'Quản trị viên',
  OPS_ADMIN: 'Vận hành (Ops)',
  DEVELOPER_ADMIN: 'Chủ đầu tư (CĐT)',
  AGENT: 'Môi giới / Sales',
  FINANCE_ADMIN: 'Tài chính',
};

const ROLE_DESCRIPTIONS: Record<TenantRole, string> = {
  ADMIN: 'Quản trị tenant · moderation · audit · IAM',
  OPS_ADMIN: 'Moderation · tranh chấp · replay booking',
  DEVELOPER_ADMIN: 'Golden Record · dự án · hoa hồng · analytics',
  AGENT: 'Listing · giữ chỗ · CRM pipeline',
  FINANCE_ADMIN: 'Sổ cái · đối soát · hoàn tiền · xuất commission',
};
