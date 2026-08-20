import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BnplPartnerClient } from './bnpl-partner.client';

describe('BnplPartnerClient', () => {
  it('returns sandbox pending when partner disabled', async () => {
    const module = await Test.createTestingModule({
      providers: [
        BnplPartnerClient,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: string) => {
              if (key === 'BNPL_PARTNER_ENABLED') return 'false';
              return def;
            },
          },
        },
      ],
    }).compile();

    const client = module.get(BnplPartnerClient);
    const result = await client.submitApplication({
      bookingId: 'bk_01',
      planId: 'bnpl_3',
      totalAmount: 500_000_000,
      tenantId: 'ten_dev_01',
    });
    expect(result.status).toBe('PENDING');
    expect(result.externalId).toMatch(/^sandbox_/);
  });
});
