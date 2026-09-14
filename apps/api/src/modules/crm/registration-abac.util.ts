/**
 * ABAC for lead registration list — Wave 0 foundation (BA-04).
 * Mask PII when viewer is not in the protecting organization.
 */

export type RegistrationViewer = {
  userId: string;
  organizationId: string | null;
  role: string;
};

export type RegistrationRowForAbac = {
  registeredBy: string;
  registeredByOrgId: string | null;
  status: string;
};

/** NNHN Admin / platform ops may see all within tenant (audited elsewhere). */
const UNMASK_ROLES = new Set(['NNHN_ADMIN', 'PLATFORM_ADMIN', 'DEVELOPER_ADMIN']);

export function shouldMaskRegistrationPii(
  row: RegistrationRowForAbac,
  viewer: RegistrationViewer | undefined,
): boolean {
  if (!viewer) return true;
  if (UNMASK_ROLES.has(viewer.role)) return false;
  if (row.registeredBy === viewer.userId) return false;
  if (
    row.registeredByOrgId &&
    viewer.organizationId &&
    row.registeredByOrgId === viewer.organizationId
  ) {
    return false;
  }
  if (row.status === 'ACCEPTED' || row.status === 'EXISTING_PROTECTED' || row.status === 'CONFLICT') {
    return true;
  }
  return row.registeredBy !== viewer.userId;
}
