/**
 * T3-S5 — Search read load (NFR-P03 P95 <= 200ms)
 */
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const TENANT = __ENV.TENANT_ID || 'ten_dev_01';
const VUS = Number(__ENV.LOAD_VUS || '50');
const P95_MS = Number(__ENV.P95_TARGET_MS || '200');

export const options = {
  scenarios: {
    search_read: {
      executor: 'constant-vus',
      vus: VUS,
      duration: '20s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: [`p(95)<${P95_MS}`],
  },
};

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'admin@sunrise-dev.vn', password: 'DevAdmin123!' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  const body = loginRes.json() as { accessToken?: string; data?: { accessToken?: string } };
  const token = body.accessToken || body.data?.accessToken;
  if (!token) throw new Error('login failed');
  return { token };
}

export default function (data: { token: string }) {
  const res = http.get(`${BASE_URL}/search?q=sunrise&limit=20`, {
    headers: {
      Authorization: `Bearer ${data.token}`,
      'X-Tenant-Id': TENANT,
    },
    tags: { name: 'search_query' },
  });
  check(res, { 'search ok': (r) => r.status === 200 });
}
