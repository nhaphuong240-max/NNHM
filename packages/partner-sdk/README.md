# @wereal/partner-sdk

Official WEREAL REOS partner SDK (Tier 3).

## Install

```bash
cd packages/partner-sdk && npm install && npm run build
```

## Usage

```typescript
import { createPartnerClient } from '@wereal/partner-sdk';

const client = createPartnerClient({
  baseUrl: 'http://localhost:3000/api/v1',
  tenantId: 'ten_dev_01',
  apiKey: process.env.WEREAL_PARTNER_API_KEY!,
});

await client.health();
await client.createLead({
  fullName: 'Partner Lead',
  phone: '+84901234567',
  consent: { privacyAccepted: true, privacyPolicyVersion: '2026-07-01' },
});
```

Register a partner key via Admin → API Marketplace or `POST /integrations/api-marketplace/partners`.

See [partner-sdk.md](../../docs/dev/partner-sdk.md).
