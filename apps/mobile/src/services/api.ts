/** API client — OpenAPI base http://localhost:3000/api/v1 (ADR-001 BFF) */
import { mapApiBooking, type ApiBookingRow } from './bookingApi';
import { authHeaders } from './auth';
import { mapApiLead } from './leadsCache';
import type { AvailableUnit, Booking, QuickBookingInput } from '../types/booking';
import { BookingConflictError } from '../types/booking';
import type { Lead } from '../types/lead';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

type ApiLeadRow = {
  id: string;
  attributes: {
    fullName: string;
    phone: string;
    score: number;
    tier: Lead['tier'];
    source: string;
    updatedAt: string;
  };
};

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function fetchAgentStatus() {
  const res = await fetch(`${API_BASE}/auth/status`);
  if (!res.ok) throw new Error(`Auth status failed: ${res.status}`);
  return res.json();
}

/** API-041 GET /leads — throws on network/HTTP error (caller falls back to cache) */
export async function fetchLeads(): Promise<Lead[]> {
  const res = await fetch(`${API_BASE}/leads`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /leads failed: ${res.status}`);
  const body = (await res.json()) as { data: ApiLeadRow[] };
  return (body.data ?? []).map(mapApiLead);
}

/** GET /units?status=AVAILABLE — first GR unit for 30s book path */
export async function fetchAvailableUnit(): Promise<AvailableUnit | null> {
  const qs = new URLSearchParams({ status: 'AVAILABLE', limit: '5' });
  const res = await fetch(`${API_BASE}/units?${qs.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /units failed: ${res.status}`);
  const body = (await res.json()) as {
    data?: Array<{
      id: string;
      attributes: {
        code: string;
        version: number;
        basePrice: number;
        area: number;
        bedrooms: number;
        status: string;
      };
    }>;
  };
  const row = body.data?.[0];
  if (!row) return null;
  return {
    id: row.id,
    code: row.attributes.code,
    version: row.attributes.version,
    basePrice: row.attributes.basePrice,
    area: row.attributes.area,
    bedrooms: row.attributes.bedrooms,
    status: row.attributes.status,
  };
}

/** API-054 POST /bookings — UC-BK-01 · OPS-S3-03 quick booking */
export async function createBooking(
  input: QuickBookingInput,
  idempotencyKey: string,
): Promise<Booking> {
  const res = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: authHeaders({
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    }),
    body: JSON.stringify(input),
  });

  const body = (await res.json()) as { data?: ApiBookingRow; detail?: string; existingBookingId?: string; expiresAt?: string };

  if (res.status === 409) {
    throw new BookingConflictError(body.detail ?? 'Unit no longer available', {
      existingBookingId: body.existingBookingId,
      expiresAt: body.expiresAt,
    });
  }

  if (!res.ok) {
    throw new Error(body.detail ?? `POST /bookings failed: ${res.status}`);
  }

  if (!body.data) {
    throw new Error('POST /bookings returned empty data');
  }

  return mapApiBooking(body.data);
}

/** API-040 POST /leads — offline-first capture sync */
export async function createLead(input: {
  fullName: string;
  phone: string;
  source?: string;
}): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      fullName: input.fullName,
      phone: input.phone,
      source: input.source ?? 'MOBILE_AGENT',
      consent: { privacyAccepted: true, privacyPolicyVersion: '2026-07-01' },
    }),
  });
  const body = (await res.json()) as { data?: { id: string }; detail?: string };
  if (!res.ok) throw new Error(body.detail ?? `POST /leads failed: ${res.status}`);
  if (!body.data?.id) throw new Error('POST /leads returned empty id');
  return { id: body.data.id };
}

export { API_BASE };
export {
  authHeaders,
  clearSession,
  getAccessToken,
  getTenantId,
  getSession,
  login,
  logout,
  refreshSession,
  restoreSession,
} from './auth';
