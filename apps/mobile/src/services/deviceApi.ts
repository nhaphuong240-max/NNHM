import { authHeaders, API_BASE } from './api';

export type DevicePlatform = 'ios' | 'android' | 'unknown';

type PushStubResponse = {
  data?: { sent: number; hint?: string; deliveries?: { status: string }[] };
  meta?: { mode?: string };
  detail?: string;
};

export async function registerPushDevice(input: {
  pushToken: string;
  platform: DevicePlatform;
  deviceName?: string;
}) {
  const res = await fetch(`${API_BASE}/mobile/devices/register`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  const body = (await res.json()) as { detail?: string; meta?: { mode?: string } };
  if (!res.ok) {
    throw new Error(body.detail ?? `POST /mobile/devices/register failed: ${res.status}`);
  }
  return body;
}

export async function sendPushStub(input?: { title?: string; body?: string }): Promise<PushStubResponse> {
  const res = await fetch(`${API_BASE}/mobile/notifications/stub`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input ?? {}),
  });
  const body = (await res.json()) as PushStubResponse;
  if (!res.ok) {
    throw new Error(body.detail ?? `POST /mobile/notifications/stub failed: ${res.status}`);
  }
  return body;
}
