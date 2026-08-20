import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { AuditService } from '../audit/audit.service';
import { PaymentEscrowService } from '../payment/payment-escrow.service';
import { RegulatoryExportService } from './regulatory-export.service';

describe('RegulatoryExportService', () => {
  let service: RegulatoryExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegulatoryExportService,
        { provide: getRepositoryToken(AuditEventEntity), useValue: { count: jest.fn().mockResolvedValue(5), find: jest.fn().mockResolvedValue([]), findOne: jest.fn() } },
        { provide: getRepositoryToken(BookingEntity), useValue: { count: jest.fn().mockResolvedValue(2) } },
        { provide: getRepositoryToken(PaymentIntentEntity), useValue: { count: jest.fn().mockResolvedValue(1) } },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        { provide: PaymentEscrowService, useValue: { countEscrowForExport: jest.fn().mockResolvedValue(0) } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: string) => {
              if (key === 'REGULATORY_EXPORT_STUB') return 'true';
              return def;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(RegulatoryExportService);
  });

  it('creates regulatory export job', async () => {
    const result = await service.createJob(
      'ten_dev_01',
      { scope: 'FULL', dateFrom: '2026-07-01', dateTo: '2026-07-29' },
      'usr_dev_admin',
    );
    expect(result.data.id.startsWith('rex_')).toBe(true);
    expect(result.data.manifestSha256).toHaveLength(64);
    expect(result.meta.screen).toBe('SCR-ADMIN-018');
  });
});
