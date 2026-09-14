/** Wave 0 — versioned tenant policy for Demand OS (SRS §17, BA-05, BA-07). */

export type DealProtectionPriority = 'FIRST_VALID_REGISTRATION' | 'FIRST_SITE_VISIT';

export type TenantDemandPolicyPayload = {
  schemaVersion: 1;
  /** Legal document id e.g. policy.dealProtection.v1 */
  dealProtectionPolicyId: string;
  dealProtection: {
    protectionDays: number;
    priority: DealProtectionPriority;
    coolingOffDaysInactive: number;
    revivalDaysAfterExpiry: number;
    viewingConfirmedExtendsProtection: boolean;
  };
  sla: {
    timezone: string;
    /** Weekday 1=Mon … 7=Sun in business window */
    businessDays: number[];
    businessHours: { start: string; end: string };
    /** HOT first-touch target minutes (P0 FR-LEAD-008) */
    hotFirstTouchMinutes: number;
    /** Follow-up for NEW/CONTACTED (hours) */
    followUpHours: number;
    holidayDates: string[];
  };
  search: {
    /** Listing stale auto-pause after N days (FR-SRCH-009) */
    listingFreshnessDays: number;
  };
  alerts: {
    quietHours: { start: string; end: string };
    maxPerDay: number;
  };
};

export type TenantDemandPolicyPatch = {
  dealProtectionPolicyId?: string;
  dealProtection?: Partial<TenantDemandPolicyPayload['dealProtection']>;
  sla?: Partial<TenantDemandPolicyPayload['sla']>;
  search?: Partial<TenantDemandPolicyPayload['search']>;
  alerts?: Partial<TenantDemandPolicyPayload['alerts']>;
};

export const DEFAULT_TENANT_DEMAND_POLICY: TenantDemandPolicyPayload = {
  schemaVersion: 1,
  dealProtectionPolicyId: 'policy.dealProtection.v1',
  dealProtection: {
    protectionDays: 30,
    priority: 'FIRST_VALID_REGISTRATION',
    coolingOffDaysInactive: 14,
    revivalDaysAfterExpiry: 7,
    viewingConfirmedExtendsProtection: true,
  },
  sla: {
    timezone: 'Asia/Ho_Chi_Minh',
    businessDays: [1, 2, 3, 4, 5, 6],
    businessHours: { start: '08:30', end: '18:00' },
    hotFirstTouchMinutes: 5,
    followUpHours: 48,
    holidayDates: [],
  },
  search: {
    listingFreshnessDays: 14,
  },
  alerts: {
    quietHours: { start: '21:00', end: '08:00' },
    maxPerDay: 3,
  },
};
