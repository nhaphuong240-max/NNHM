/**
 * T3-S5 — API read load (NFR-P01 / staging P95 < 200ms)
 */
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const TENANT = __ENV.TENANT_ID || 'ten_dev_01';
const VUS = Number(__ENV.LOAD_VUS || '100');
const P95_MS = Number(__ENV.P95_TARGET_MS || '200');

export const options = {
  scenarios: {
    read_burst: {
      executor: 'constant-vus',
      vus: VUS,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
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
  const headers = {
    Authorization: `Bearer ${data.token}`,
    'X-Tenant-Id': TENANT,
  };

  const health = http.get(`${BASE_URL}/health/live`, { headers, tags: { name: 'health_live' } });
  check(health, { 'health 200': (r) => r.status === 200 });

  const projects = http.get(`${BASE_URL}/golden-record/projects`, {
    headers,
    tags: { name: 'list_projects' },
  });
  check(projects, { 'projects ok': (r) => r.status === 200 || r.status === 404 });
}
