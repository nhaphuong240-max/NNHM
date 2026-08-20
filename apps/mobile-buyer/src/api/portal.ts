import { config } from '../config';

export type BuyerDealStep = {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
};

export type BuyerDeal = {
  id: string;
  unitCode?: string;
  status: string;
  depositAmount?: number;
  steps?: BuyerDealStep[];
  paymentIntentId?: string;
};

export type BuyerSignSession = {
  contractId: string;
  signingUrl: string;
  otpHint?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': config.tenantId,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchDeals() {
  const body = await request<{ data: BuyerDeal[] }>('/portal/buyer/deals');
  return body.data ?? [];
}

export async function fetchDeal(bookingId: string) {
  const body = await request<{ data: { attributes: BuyerDeal } }>(
    `/portal/buyer/deals/${encodeURIComponent(bookingId)}`,
  );
  const deal = body.data.attributes;
  return { ...deal, steps: deal.steps ?? [] };
}

export async function applyBnpl(bookingId: string, planId = 'bnpl_3') {
  return request<{ data: { id: string; status: string } }>(
    `/portal/buyer/deals/${encodeURIComponent(bookingId)}/bnpl`,
    {
      method: 'POST',
      body: JSON.stringify({ planId }),
    },
  );
}

export async function fetchSignSession(bookingId: string) {
  const body = await request<{ data: BuyerSignSession }>(
    `/portal/buyer/deals/${encodeURIComponent(bookingId)}/sign-session`,
  );
  return body.data;
}

export async function registerPushToken(token: string) {
  return request('/portal/buyer/devices/register', {
    method: 'POST',
    body: JSON.stringify({ pushToken: token, platform: 'expo' }),
  }).catch(() => undefined);
}

export async function fetchBnplPlans() {
  const body = await request<{ data: Array<{ id: string; label: string }> }>('/bnpl/plans');
  return body.data ?? [];
}
