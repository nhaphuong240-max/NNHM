import { authHeaders, API_BASE } from './api';

export type MobileActivityResponse = {
  data: { eventType: string; wauSimEnabled: boolean };
  meta?: { tenantId?: string };
};

export type AgentWauResponse = {
  data: {
    wau7d: number;
    wauSimEnabled: boolean;
    targetWau: number;
  };
};

/** POST /mobile/activity — real WAU events (APP_SESSION, LEAD_CAPTURE) */
export async function postMobileActivity(
  eventType: string,
  payload?: Record<string, unknown>,
): Promise<MobileActivityResponse> {
  const res = await fetch(`${API_BASE}/mobile/activity`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ eventType, payload }),
  });
  const body = (await res.json()) as MobileActivityResponse & { detail?: string };
  if (!res.ok) throw new Error(body.detail ?? `POST /mobile/activity failed: ${res.status}`);
  return body;
}

/** GET /analytics/agent/wau — tenant WAU + sim flag */
export async function fetchAgentWau(days = 7): Promise<AgentWauResponse> {
  const res = await fetch(`${API_BASE}/analytics/agent/wau?days=${days}`, {
    headers: authHeaders(),
  });
  const body = (await res.json()) as AgentWauResponse & { detail?: string };
  if (!res.ok) throw new Error(body.detail ?? `GET /analytics/agent/wau failed: ${res.status}`);
  return body;
}
