export type RoleCode =
  | 'PLATFORM_OPS'
  | 'CDT_PROJECT_ADMIN'
  | 'CDT_LEGAL'
  | 'MASTER_DISTRIBUTOR'
  | 'AGENCY_ADMIN'
  | 'TEAM_LEAD'
  | 'SALES'
  | 'FINANCE_MAKER'
  | 'FINANCE_CHECKER'
  | 'BUYER'
  | 'SUPPORT_AUDITOR'
  | 'SERVICE_IDENTITY';

const LEGACY_ROLE_MAP: Record<string, RoleCode> = {
  ADMIN: 'PLATFORM_OPS',
  OPS_ADMIN: 'PLATFORM_OPS',
  DEVELOPER_ADMIN: 'CDT_PROJECT_ADMIN',
  AGENT: 'SALES',
  FINANCE_ADMIN: 'FINANCE_MAKER',
  AGENCY_ADMIN: 'AGENCY_ADMIN',
  SEEKER: 'BUYER',
};

export type Grant = {
  tenantId: string;
  granteeOrgId: string;
  projectId: string;
  action: string;
  resource: string;
  expiresAt: Date | null;
  status: 'ACTIVE' | 'REVOKED';
  parent?: Grant | null;
};

export type AccessDecision = { allow: false; reason: string } | { allow: true; reason: 'grant' };

export function mapLegacyRole(role: string): RoleCode | null {
  return LEGACY_ROLE_MAP[role] ?? null;
}

/** Membership is not a grant. Missing or expired grants deny. */
export function decideAccess(
  input: {
    actorTenantId: string;
    actorOrgId: string;
    action: string;
    resource: string;
    projectId: string;
    now: Date;
    grants: Grant[];
  },
): AccessDecision {
  const match = input.grants.find((grant) => {
    if (grant.status !== 'ACTIVE') return false;
    if (grant.tenantId !== input.actorTenantId) return false;
    if (grant.granteeOrgId !== input.actorOrgId) return false;
    if (grant.projectId !== input.projectId) return false;
    if (grant.action !== input.action || grant.resource !== input.resource) return false;
    if (grant.expiresAt && grant.expiresAt.getTime() <= input.now.getTime()) return false;
    if (grant.parent) {
      const parentOk =
        grant.parent.status === 'ACTIVE' &&
        (!grant.parent.expiresAt || grant.parent.expiresAt.getTime() > input.now.getTime()) &&
        grant.parent.action === grant.action &&
        grant.parent.resource === grant.resource;
      if (!parentOk) return false;
    }
    return true;
  });
  if (!match) return { allow: false, reason: 'deny-by-default' };
  return { allow: true, reason: 'grant' };
}

export type ReviewItem = {
  userId: string;
  legacyRole: string;
  proposedRole: RoleCode | null;
  projectId: null;
  needsHumanApproval: true;
};

/** Propose the minimum role. Do not grant every project. */
export function reviewItemsFromLegacyRoles(
  users: Array<{ userId: string; role: string }>,
): ReviewItem[] {
  return users.map((user) => ({
    userId: user.userId,
    legacyRole: user.role,
    proposedRole: mapLegacyRole(user.role),
    projectId: null,
    needsHumanApproval: true,
  }));
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
}

export function exportJobAllowed(input: {
  purpose: string;
  approvedBy: string | null;
  requesterId: string;
  rowCount: number;
  rowLimit: number;
  expiresAt: Date;
  now: Date;
}): { ok: true; label: 'APPROVED' } | { ok: false; reason: string } {
  if (!input.purpose.trim()) return { ok: false, reason: 'purpose required' };
  if (!input.approvedBy || input.approvedBy === input.requesterId) {
    return { ok: false, reason: 'maker cannot approve the export' };
  }
  if (input.rowCount > input.rowLimit) return { ok: false, reason: 'row limit exceeded' };
  if (input.expiresAt.getTime() <= input.now.getTime()) return { ok: false, reason: 'export expired' };
  return { ok: true, label: 'APPROVED' };
}

export function allocationAllowsPlacement(input: {
  status: string;
  expiresAt: Date;
  now: Date;
  unitId: string;
  requestedUnitId: string;
}): boolean {
  return (
    input.status === 'ACTIVE' &&
    input.expiresAt.getTime() > input.now.getTime() &&
    input.unitId === input.requestedUnitId
  );
}

export function priceWindowsOverlap(
  left: { from: Date; to: Date | null },
  right: { from: Date; to: Date | null },
): boolean {
  const leftEnd = left.to?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightEnd = right.to?.getTime() ?? Number.POSITIVE_INFINITY;
  return left.from.getTime() < rightEnd && right.from.getTime() < leftEnd;
}

export function quoteIsImmutable(status: string): boolean {
  return status === 'ACCEPTED';
}

export function claimHold(existing: Array<{ unitId: string; status: string }>, unitId: string): {
  ok: boolean;
  reason: string;
} {
  const active = existing.some(
    (row) => row.unitId === unitId && (row.status === 'RESERVED' || row.status === 'DEPOSITED'),
  );
  if (active) return { ok: false, reason: 'active hold exists' };
  return { ok: true, reason: 'claimed' };
}

export function serverObligationAmount(depositAmount: string | null): number | null {
  if (depositAmount == null) return null;
  const amount = Number(depositAmount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

export function serverObligationCurrency(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;
  return code;
}

export function refundWithinNet(collected: number, alreadyRefunded: number, next: number): boolean {
  return next > 0 && alreadyRefunded + next <= collected;
}

/** Sandbox labels never become PAID. PAID requires bank evidence, which this helper does not invent. */
export function settlementLabel(kind: string, bankEvidence?: string | null): string {
  if (kind === 'SANDBOX' || kind === 'SIMULATED' || kind === 'SKIPPED') return kind;
  if (kind === 'PAID' && bankEvidence?.trim()) return 'PAID';
  return 'NOT_PAID';
}

export function copilotMayWrite(field: string): boolean {
  return ![
    'price',
    'inventory',
    'hold',
    'commission',
    'refund',
    'contract',
  ].includes(field);
}

export function copilotAnswer(sources: string[]): { text: string; citations: string[] } | { abstain: true } {
  if (!sources.length) return { abstain: true };
  return { text: 'SYNTHETIC brief. A person must approve before anything is sent.', citations: sources };
}
