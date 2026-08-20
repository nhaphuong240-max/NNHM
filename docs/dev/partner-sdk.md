# Partner SDK — Tier 3

## Register partner

```bash
curl -X POST http://localhost:3000/api/v1/integrations/api-marketplace/partners \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: ten_dev_01" \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Partner","category":"CRM"}'
```

Save `apiKey` from response (shown once).

## SDK

Package: [packages/partner-sdk](../../packages/partner-sdk)

```typescript
import { createPartnerClient } from '@wereal/partner-sdk';

const client = createPartnerClient({
  baseUrl: 'http://localhost:3000/api/v1',
  tenantId: 'ten_dev_01',
  apiKey: 'ptk_...',
});

await client.createLead({
  fullName: 'SDK Lead',
  phone: '+84901234567',
  consent: { privacyAccepted: true },
});
```

## Rate limit

Default **60 req/min** per partner (`rateLimitPerMin`). Exceed → HTTP 429.

## Auth headers

| Header | Required |
|--------|----------|
| `X-Partner-Api-Key` | Yes |
| `X-Tenant-Id` | Yes |

## Versioning

Semver `@wereal/partner-sdk` — breaking OpenAPI changes bump major.
