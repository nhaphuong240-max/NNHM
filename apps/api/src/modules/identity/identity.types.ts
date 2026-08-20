export const IS_PUBLIC_KEY = 'isPublic';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
}

export interface LoginInput {
  email: string;
  password: string;
  tenantId?: string;
}

export interface LoginResult {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  tokenType: 'Bearer';
  user: {
    id: string;
    email: string;
    tenantId: string;
    roles: string[];
  };
}

/** Roles that must complete TOTP after password when tenant `mfaSandbox=false`. */
export const MFA_LOGIN_ROLES = ['DEVELOPER_ADMIN', 'FINANCE_ADMIN'] as const;

export type MfaLoginRole = (typeof MFA_LOGIN_ROLES)[number];

export interface MfaChallengeResult {
  mfaRequired: true;
  challengeId: string;
  email: string;
  tenantId: string;
  role: string;
  expiresIn: number;
}

export type LoginResponseData = LoginResult | MfaChallengeResult;

export function isMfaChallengeResult(data: LoginResponseData): data is MfaChallengeResult {
  return 'mfaRequired' in data && data.mfaRequired === true;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface MfaVerifyInput {
  mfaOtp: string;
  email?: string;
  challengeId?: string;
}

export interface TenantRecord {
  id: string;
  attributes: {
    name: string;
    type: string;
    isActive: boolean;
    createdAt: string;
  };
}

export interface UserRecord {
  id: string;
  attributes: {
    email: string;
    role: string;
    status: 'ACTIVE' | 'DEACTIVATED';
    tenantId: string;
    createdAt: string;
  };
}

export interface MeResult {
  user: LoginResult['user'];
  tenant: TenantRecord;
  permissions: string[];
}

export interface CreateTenantInput {
  name: string;
  type: 'DEVELOPER' | 'AGENCY' | 'PLATFORM';
  slug?: string;
}
