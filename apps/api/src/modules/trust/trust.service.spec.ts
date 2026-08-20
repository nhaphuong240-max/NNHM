import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TrustDisputeEntity } from '../../database/entities/trust-dispute.entity';
import { AuditService } from '../audit/audit.service';
import { TrustService } from './trust.service';

describe('TrustService', () => {
  let service: TrustService;
  const rows: TrustDisputeEntity[] = [];

  beforeEach(async () => {
    rows.length = 0;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrustService,
        {
          provide: getRepositoryToken(TrustDisputeEntity),
          useValue: {
            find: jest.fn(async () => [...rows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())),
            findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
              rows.find((r) => r.id === where.id && r.tenantId === where.tenantId) ?? null,
            ),
            save: jest.fn(async (row: TrustDisputeEntity) => {
              const now = new Date();
              const saved = {
                ...row,
                createdAt: row.createdAt ?? now,
                updatedAt: now,
              };
              const idx = rows.findIndex((r) => r.id === saved.id);
              if (idx >= 0) rows[idx] = saved;
              else rows.push(saved);
              return saved;
            }),
          },
        },
        {
          provide: AuditService,
          useValue: { append: jest.fn(async () => undefined) },
        },
      ],
    }).compile();

    service = module.get(TrustService);
  });

  it('opens and resolves dispute (UC-TR-03)', async () => {
    const opened = await service.openDispute('ten_dev_01', {
      bookingId: 'bk_settle01',
      type: 'PAYMENT',
      reason: 'Test dispute',
    });
    expect(opened.data.attributes.status).toBe('OPEN');

    const resolved = await service.resolveDispute('ten_dev_01', opened.data.id, {
      resolutionNote: 'Refunded buyer',
    });
    expect(resolved.data.attributes.status).toBe('RESOLVED');
  });
});
