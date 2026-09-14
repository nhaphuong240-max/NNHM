import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Stable business error codes — NNHN-Business-Error-Catalog v1.0 (Wave 0).
 * Do not rename strings; clients and UAT scripts depend on them.
 */
export const BusinessErrorCode = {
  LEAD_DEDUPED: 'LEAD_DEDUPED',
  REGISTRATION_PROTECTED: 'REGISTRATION_PROTECTED',
  REGISTRATION_CONFLICT: 'REGISTRATION_CONFLICT',
  VIEWING_SLOT_INVALID: 'VIEWING_SLOT_INVALID',
  VIEWING_SLOT_CONFLICT: 'VIEWING_SLOT_CONFLICT',
  SLA_NOT_APPLICABLE: 'SLA_NOT_APPLICABLE',
  INTENT_INDEX_MISS: 'INTENT_INDEX_MISS',
  SEEKER_OTP_INVALID: 'SEEKER_OTP_INVALID',
  ALERT_OPTED_OUT: 'ALERT_OPTED_OUT',
  DISPUTE_OPEN: 'DISPUTE_OPEN',
  PDPA_CONSENT_REQUIRED: 'PDPA_CONSENT_REQUIRED',
  PHONE_INVALID: 'PHONE_INVALID',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  QUALIFICATION_INCOMPLETE: 'QUALIFICATION_INCOMPLETE',
  VIEWING_CHECKLIST_INCOMPLETE: 'VIEWING_CHECKLIST_INCOMPLETE',
  CMS_THIN_PAGE: 'CMS_THIN_PAGE',
  SHARE_LINK_EXPIRED: 'SHARE_LINK_EXPIRED',
} as const;

export type BusinessErrorCodeValue = (typeof BusinessErrorCode)[keyof typeof BusinessErrorCode];

const PROBLEM_BASE = 'https://wereal.dev/problems';

const META: Record<
  BusinessErrorCodeValue,
  { type: string; title: string; http: '422' | '409' | '403' | '404' }
> = {
  LEAD_DEDUPED: {
    type: `${PROBLEM_BASE}/lead-deduped`,
    title: 'Lead merged',
    http: '422',
  },
  REGISTRATION_PROTECTED: {
    type: `${PROBLEM_BASE}/registration-protected`,
    title: 'Customer protected by another partner',
    http: '409',
  },
  REGISTRATION_CONFLICT: {
    type: `${PROBLEM_BASE}/registration-conflict`,
    title: 'Registration conflict',
    http: '409',
  },
  VIEWING_SLOT_INVALID: {
    type: `${PROBLEM_BASE}/viewing-slot-invalid`,
    title: 'Invalid viewing slot',
    http: '422',
  },
  VIEWING_SLOT_CONFLICT: {
    type: `${PROBLEM_BASE}/viewing-slot-conflict`,
    title: 'Viewing slot conflict',
    http: '409',
  },
  SLA_NOT_APPLICABLE: {
    type: `${PROBLEM_BASE}/sla-not-applicable`,
    title: 'SLA not applicable outside business hours',
    http: '422',
  },
  INTENT_INDEX_MISS: {
    type: `${PROBLEM_BASE}/intent-index-miss`,
    title: 'Search index missing transaction type',
    http: '422',
  },
  SEEKER_OTP_INVALID: {
    type: `${PROBLEM_BASE}/seeker-otp-invalid`,
    title: 'Invalid seeker OTP',
    http: '422',
  },
  ALERT_OPTED_OUT: {
    type: `${PROBLEM_BASE}/alert-opted-out`,
    title: 'Alert opted out',
    http: '422',
  },
  DISPUTE_OPEN: {
    type: `${PROBLEM_BASE}/dispute-open`,
    title: 'Deal dispute open',
    http: '409',
  },
  PDPA_CONSENT_REQUIRED: {
    type: `${PROBLEM_BASE}/pdpa-consent-required`,
    title: 'PDPA consent required',
    http: '422',
  },
  PHONE_INVALID: {
    type: `${PROBLEM_BASE}/phone-invalid`,
    title: 'Invalid phone number',
    http: '422',
  },
  VALIDATION_FAILED: {
    type: `${PROBLEM_BASE}/validation`,
    title: 'Validation failed',
    http: '422',
  },
  NOT_FOUND: {
    type: `${PROBLEM_BASE}/not-found`,
    title: 'Resource not found',
    http: '404',
  },
  FORBIDDEN: {
    type: `${PROBLEM_BASE}/forbidden`,
    title: 'Forbidden',
    http: '403',
  },
  QUALIFICATION_INCOMPLETE: {
    type: `${PROBLEM_BASE}/qualification-incomplete`,
    title: 'Lead qualification incomplete',
    http: '422',
  },
  VIEWING_CHECKLIST_INCOMPLETE: {
    type: `${PROBLEM_BASE}/viewing-checklist-incomplete`,
    title: 'Viewing checklist incomplete',
    http: '422',
  },
  CMS_THIN_PAGE: {
    type: `${PROBLEM_BASE}/cms-thin-page`,
    title: 'Page not indexable — insufficient inventory',
    http: '422',
  },
  SHARE_LINK_EXPIRED: {
    type: `${PROBLEM_BASE}/share-link-expired`,
    title: 'Share link expired',
    http: '422',
  },
};

export type BusinessErrorBody = {
  type: string;
  title: string;
  detail: string;
  code: BusinessErrorCodeValue;
  [key: string]: unknown;
};

export function businessErrorBody(
  code: BusinessErrorCodeValue,
  detail: string,
  extra?: Record<string, unknown>,
): BusinessErrorBody {
  const meta = META[code];
  return {
    type: meta.type,
    title: meta.title,
    detail,
    code,
    ...extra,
  };
}

export function throwBusinessError(
  code: BusinessErrorCodeValue,
  detail: string,
  extra?: Record<string, unknown>,
): never {
  const body = businessErrorBody(code, detail, extra);
  const meta = META[code];
  switch (meta.http) {
    case '404':
      throw new NotFoundException(body);
    case '403':
      throw new ForbiddenException(body);
    case '409':
      throw new ConflictException(body);
    default:
      throw new UnprocessableEntityException(body);
  }
}
