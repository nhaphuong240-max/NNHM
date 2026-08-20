import { authHeaders, API_BASE } from './api';
import type { PendingActivityPayload } from '../types/activity';

type SyncBatchResponse = {
  data: {
    synced: unknown[];
    failed: { clientRequestId: string; reason: string }[];
    skipped: string[];
  };
};

/** POST /activities — online single activity */
export async function postActivity(payload: PendingActivityPayload) {
  const res = await fetch(`${API_BASE}/activities`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      leadId: payload.leadId,
      type: payload.type,
      summary: payload.summary,
      metadata: payload.metadata,
    }),
  });

  const body = (await res.json()) as { detail?: string };
  if (!res.ok) {
    throw new Error(body.detail ?? `POST /activities failed: ${res.status}`);
  }
  return body;
}

/** POST /mobile/activities/sync — offline batch flush */
export async function syncActivityBatch(items: PendingActivityPayload[]): Promise<SyncBatchResponse> {
  const res = await fetch(`${API_BASE}/mobile/activities/sync`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      items: items.map((item) => ({
        clientRequestId: item.metadata.clientRequestId,
        leadId: item.leadId,
        type: item.type,
        summary: item.summary,
        metadata: item.metadata,
      })),
    }),
  });

  const body = (await res.json()) as SyncBatchResponse & { detail?: string };
  if (!res.ok) {
    throw new Error(body.detail ?? `POST /mobile/activities/sync failed: ${res.status}`);
  }
  return body;
}
