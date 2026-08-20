import { createHmac } from 'crypto';

export type WerealPartnerClientOptions = {
  baseUrl: string;
  tenantId: string;
  apiKey: string;
  webhookSecret?: string;
  fetchImpl?: typeof fetch;
};

export type CreateLeadInput = {
  fullName: string;
  phone: string;
  source?: string;
  consent?: {
    privacyAccepted: boolean;
    privacyPolicyVersion?: string;
    marketing?: boolean;
  };
};

export class WerealPartnerClient {
  private readonly baseUrl: string;
  private readonly tenantId: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: WerealPartnerClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.tenantId = options.tenantId;
    this.apiKey = options.apiKey;
    this.webhookSecret = options.webhookSecret ?? 'wereal_partner_stub_secret';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private headers(extra?: Record<string, string>) {
    return {
      'Content-Type': 'application/json',
      'X-Tenant-Id': this.tenantId,
      'X-Partner-Api-Key': this.apiKey,
      ...extra,
    };
  }

  async health(): Promise<{ status: string }> {
    const res = await this.fetchImpl(`${this.baseUrl}/health/live`);
    if (!res.ok) throw new Error(`health failed: ${res.status}`);
    return res.json() as Promise<{ status: string }>;
  }

  async createLead(input: CreateLeadInput): Promise<unknown> {
    const res = await this.fetchImpl(`${this.baseUrl}/partner/v1/leads`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`createLead failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  async getBookingStatus(bookingId: string): Promise<unknown> {
    const res = await this.fetchImpl(`${this.baseUrl}/partner/v1/bookings/${bookingId}/status`, {
      method: 'GET',
      headers: this.headers(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`getBookingStatus failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  verifyWebhookSignature(payload: string | Record<string, unknown>, signature: string): boolean {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expected = createHmac('sha256', this.webhookSecret).update(body).digest('hex');
    return signature === expected || signature === `sha256=${expected}`;
  }

  async syncUnits(input: {
    idempotencyKey: string;
    units: Array<{ unitId: string; status?: string; basePrice?: number }>;
  }): Promise<unknown> {
    const res = await this.fetchImpl(`${this.baseUrl}/partner/v1/units/sync`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`syncUnits failed: ${res.status} ${text}`);
    }
    return res.json();
  }
}

export function createPartnerClient(options: WerealPartnerClientOptions) {
  return new WerealPartnerClient(options);
}
