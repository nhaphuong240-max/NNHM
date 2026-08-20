import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { AiAnomalyService } from './ai-anomaly.service';

describe('AiAnomalyService', () => {
  let service: AiAnomalyService;
  const auditAppend = jest.fn().mockResolvedValue({});

  beforeEach(async () => {
    const listings = [
      {
        id: 'ls_anomaly_demo',
        tenantId: 'ten_dev_01',
        unitId: 'un_02',
        title: 'Anomaly demo',
        status: 'PUBLISHED',
        priceDisplay: '5000000000',
        antiDriftStatus: 'BLOCK',
        createdAt: new Date('2026-07-01'),
        updatedAt: new Date('2026-07-01'),
      },
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAnomalyService,
        {
          provide: getRepositoryToken(ListingEntity),
          useValue: { find: jest.fn().mockResolvedValue(listings) },
        },
        {
          provide: getRepositoryToken(UnitEntity),
          useValue: {
            find: jest.fn().mockResolvedValue([
              {
                id: 'un_02',
                tenantId: 'ten_dev_01',
                code: 'A-12-06',
                basePrice: '4100000000',
                status: 'AVAILABLE',
                area: '72.50',
              },
            ]),
          },
        },
        {
          provide: getRepositoryToken(AuditEventEntity),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        { provide: AuditService, useValue: { append: auditAppend } },
      ],
    }).compile();

    service = module.get(AiAnomalyService);
  });

  it('lists flagged anomalies', async () => {
    const result = await service.listAnomalies('ten_dev_01');
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.meta.openCount).toBeGreaterThan(0);
    expect(result.data[0]!.signals.length).toBeGreaterThan(0);
  });

  it('resolves anomaly via audit', async () => {
    const listed = await service.listAnomalies('ten_dev_01');
    const id = listed.data[0]!.id;
    const result = await service.resolveAnomaly('ten_dev_01', id, { action: 'RESOLVE', note: 'OK' }, 'usr_dev_admin');
    expect(result.data.queueStatus).toBe('RESOLVED');
    expect(auditAppend).toHaveBeenCalled();
  });
});
