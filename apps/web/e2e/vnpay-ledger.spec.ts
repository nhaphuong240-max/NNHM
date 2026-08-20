import { test, expect } from '@playwright/test';
import { signWebhookPayload } from './helpers/hmac';

const API_BASE = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000/api/v1';
const WEBHOOK_SECRET =
  process.env.E2E_WEBHOOK_SECRET ?? 'wereal-dev-webhook-secret-change-me';
const PILOT_TENANT = 'ten_pilot_cdt_01';
const PILOT_AGENT = {
  email: 'agent@thanglong-dev.vn',
  password: 'PilotAgent123!',
} as const;

type LoginJson = {
  data?: {
    accessToken?: string;
    mfaRequired?: boolean;
    user?: { id: string; tenantId: string };
  };
};

async function loginPilotAgent(): Promise<{ token: string; tenantId: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: PILOT_AGENT.email,
      password: PILOT_AGENT.password,
      tenantId: PILOT_TENANT,
    }),
  });
  expect(res.ok, `pilot agent login ${res.status}`).toBeTruthy();
  const json = (await res.json()) as LoginJson;
  expect(json.data?.mfaRequired, 'pilot AGENT must not hit MFA').toBeFalsy();
  const token = json.data?.accessToken;
  expect(token).toBeTruthy();
  return { token: token!, tenantId: json.data?.user?.tenantId ?? PILOT_TENANT };
}

test.describe('OPS-S2 E2E · VNPay sandbox IPN → ledger', () => {
  test('book → VNPay sandbox URL → HMAC IPN → 2 ledger lines', async () => {
    const { token, tenantId } = await loginPilotAgent();
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
    };

    const unitsRes = await fetch(`${API_BASE}/units?status=AVAILABLE&limit=20`, {
      headers: authHeaders,
    });
    expect(unitsRes.ok, `list units ${unitsRes.status}`).toBeTruthy();
    const unitsJson = (await unitsRes.json()) as {
      data: Array<{ id: string; attributes: { version: number; status: string } }>;
    };
    const unit = unitsJson.data.find((u) => u.id === 'tl_un_02') ?? unitsJson.data[0];
    expect(unit, 'need an AVAILABLE unit on ten_pilot_cdt_01').toBeTruthy();

    const bookRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'X-Idempotency-Key': `e2e-s2-${Date.now()}`,
      },
      body: JSON.stringify({
        unitId: unit.id,
        expectedUnitVersion: unit.attributes.version,
        depositAmount: 50_000_000,
      }),
    });
    const bookBody = await bookRes.json();
    expect(bookRes.status, JSON.stringify(bookBody)).toBe(201);
    const bookingId = (bookBody as { data: { id: string } }).data.id;

    const payRes = await fetch(`${API_BASE}/payment-intents`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        bookingId,
        amount: 50_000_000,
        currency: 'VND',
      }),
    });
    const payBody = await payRes.json();
    expect(payRes.status, JSON.stringify(payBody)).toBe(201);
    const payJson = payBody as {
      data: { id: string; attributes: { paymentUrl: string; method: string; amount: number } };
    };
    expect(payJson.data.attributes.method).toBe('VNPAY');
    expect(payJson.data.attributes.paymentUrl).toContain('sandbox.vnpayment.vn');

    const intentId = payJson.data.id;
    const payload = {
      eventId: `evt_e2e_${Date.now()}`,
      eventType: 'payment.success',
      transactionId: `VNPAY_SANDBOX_${intentId}`,
      amount: 50_000_000,
      paymentIntentId: intentId,
      tenantId,
      timestamp: new Date().toISOString(),
    };
    const signature = signWebhookPayload(payload, WEBHOOK_SECRET);

    const ipnRes = await fetch(`${API_BASE}/webhooks/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      body: JSON.stringify(payload),
    });
    const ipnBody = await ipnRes.json().catch(() => null);
    expect(ipnRes.ok, JSON.stringify(ipnBody)).toBeTruthy();

    const ledgerRes = await fetch(
      `${API_BASE}/ledger/entries?bookingId=${encodeURIComponent(bookingId)}`,
      { headers: authHeaders },
    );
    expect(ledgerRes.ok).toBeTruthy();
    const ledgerJson = (await ledgerRes.json()) as {
      data: Array<{
        attributes: {
          balanced: boolean;
          lines: Array<{ side: string; account: string }>;
        };
      }>;
    };
    expect(ledgerJson.data.length).toBeGreaterThanOrEqual(1);
    const journal = ledgerJson.data[0];
    expect(journal.attributes.balanced).toBe(true);
    expect(journal.attributes.lines).toHaveLength(2);
    const sides = journal.attributes.lines.map((l) => l.side).sort();
    expect(sides).toEqual(['CREDIT', 'DEBIT']);
    expect(journal.attributes.lines.some((l) => l.account === 'CASH_VNPAY')).toBe(true);
  });
});
