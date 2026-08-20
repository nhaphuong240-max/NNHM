import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiPartnerEntity } from '../../database/entities/api-partner.entity';
import { ApiPartnerKeyEntity } from '../../database/entities/api-partner-key.entity';
import { ApiWebhookDeliveryEntity } from '../../database/entities/api-webhook-delivery.entity';
import { AuditService } from '../audit/audit.service';
import { ApiMarketplaceService } from './api-marketplace.service';

describe('ApiMarketplaceService', () => {
  let service: ApiMarketplaceService;

  const partnerRepo = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn(async (row) => row),
    increment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiMarketplaceService,
        { provide: getRepositoryToken(ApiPartnerEntity), useValue: partnerRepo },
        { provide: getRepositoryToken(ApiPartnerKeyEntity), useValue: { findOne: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(ApiWebhookDeliveryEntity), useValue: { find: jest.fn().mockResolvedValue([]), save: jest.fn() } },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    service = module.get(ApiMarketplaceService);
  });

  it('lists seeded partners after ensure', async () => {
    partnerRepo.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id: 'ptn_bank', name: 'Bank', category: 'BANK', status: 'ACTIVE', rateLimitPerMin: 60, eventsConsumed: 0, webhookUrl: null, updatedAt: new Date() },
      ]),
    });
    const result = await service.listPartners('ten_dev_01');
    expect(result.data.partners.length).toBeGreaterThan(0);
    expect(result.meta.screen).toBe('SCR-ADMIN-004');
  });
});
