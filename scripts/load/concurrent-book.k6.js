/**
 * P3-S2-02 · OP-WIN-01 · UC-BK-01 — 50 parallel booking attempts on one unit
 *
 * Usage:
 *   k6 run scripts/load/concurrent-book.k6.js
 *   BASE_URL=http://localhost:3000/api/v1 LOAD_UNIT_ID=un_04 k6 run scripts/load/concurrent-book.k6.js
 *
 * Pass: exactly 1× HTTP 201, 49× HTTP 409, 0 double-book
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const TENANT = __ENV.TENANT_ID || 'ten_dev_01';
const UNIT_ID = __ENV.LOAD_UNIT_ID || 'un_04';
const LEAD_ID = __ENV.LOAD_LEAD_ID || 'ld_01';
const DEPOSIT = Number(__ENV.LOAD_DEPOSIT || '50000000');
const VUS = Number(__ENV.LOAD_VUS || '100');
const P95_MS = Number(__ENV.P95_TARGET_MS || '500');

const bookingSuccess = new Counter('booking_success');
const bookingConflict = new Counter('booking_conflict');
const bookingOther = new Counter('booking_other');

export const options = {
  scenarios: {
    concurrent_burst: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '60s',
    },
  },
  thresholds: {
    booking_success: [`count==1`],
    booking_conflict: [`count==${VUS - 1}`],
    booking_other: ['count==0'],
    http_req_failed: ['rate<0.05'],
    http_req_duration: [`p(95)<${P95_MS}`],
  },
};

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: 'admin@sunrise-dev.vn',
      password: 'DevAdmin123!',
    }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } },
  );

  check(loginRes, {
    'login 200': (r) => r.status === 200 || r.status === 201,
  });

  const body = loginRes.json();
  const token = body.accessToken || body.data?.accessToken;
  if (!token) {
    throw new Error(`Login failed: ${loginRes.status} ${loginRes.body}`);
  }

  return { token };
}

export default function (data) {
  const idem = `k6-${__VU}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = JSON.stringify({
    unitId: UNIT_ID,
    leadId: LEAD_ID,
    depositAmount: DEPOSIT,
  });

  const res = http.post(`${BASE_URL}/bookings`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
      'X-Tenant-Id': TENANT,
      'X-Idempotency-Key': idem,
    },
    tags: { name: 'create_booking' },
  });

  if (res.status === 201) {
    bookingSuccess.add(1);
  } else if (res.status === 409) {
    bookingConflict.add(1);
  } else {
    bookingOther.add(1);
    console.warn(`unexpected status ${res.status}: ${res.body?.slice?.(0, 200) ?? res.body}`);
  }

  sleep(0.01);
}

export function handleSummary(data) {
  const success = data.metrics.booking_success?.values?.count ?? 0;
  const conflict = data.metrics.booking_conflict?.values?.count ?? 0;
  const other = data.metrics.booking_other?.values?.count ?? 0;
  const lines = [
    '',
    '=== OP-WIN-01 concurrent book load summary ===',
    `BASE_URL=${BASE_URL}`,
    `UNIT=${UNIT_ID} · VUS=${VUS}`,
    `201 success: ${success} (expected 1)`,
    `409 conflict: ${conflict} (expected ${VUS - 1})`,
    `other status: ${other} (expected 0)`,
    success === 1 && conflict === VUS - 1 && other === 0
      ? 'RESULT: PASS — 0 double-book'
      : 'RESULT: FAIL — review thresholds / unit availability',
    '',
  ];
  return {
    stdout: lines.join('\n'),
  };
}
