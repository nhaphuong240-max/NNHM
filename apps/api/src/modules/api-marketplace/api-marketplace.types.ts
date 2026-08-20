export type ApiPartnerStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

export type ApiPartnerRecord = {
  id: string;
  name: string;
  category: 'BANK' | 'ERP' | 'NOTARY' | 'VALUATION' | 'OTHER';
  status: ApiPartnerStatus;
  webhookUrl?: string;
  apiKeyPrefix: string;
  rateLimitPerMin: number;
  eventsConsumed: number;
  lastDeliveryAt?: string;
};

export type ApiWebhookDelivery = {
  id: string;
  partnerId: string;
  event: string;
  status: 'DELIVERED' | 'FAILED' | 'RETRY';
  deliveredAt: string;
  responseCode?: number;
};

export const DEMO_API_PARTNERS: ApiPartnerRecord[] = [
  {
    id: 'ptn_vcb_pilot',
    name: 'Vietcombank Open API',
    category: 'BANK',
    status: 'ACTIVE',
    webhookUrl: 'https://partner.vcb.example/wereal/webhook',
    apiKeyPrefix: 'vcb_live_****',
    rateLimitPerMin: 120,
    eventsConsumed: 842,
    lastDeliveryAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: 'ptn_valuation01',
    name: 'PropValuation VN',
    category: 'VALUATION',
    status: 'PENDING',
    apiKeyPrefix: 'pv_test_****',
    rateLimitPerMin: 60,
    eventsConsumed: 0,
  },
];

export function maskApiKey(prefix: string): string {
  return `${prefix.slice(0, 8)}…`;
}

export function issuePartnerKey(partnerId: string): string {
  return `wereal_${partnerId}_${Date.now().toString(36)}`;
}
