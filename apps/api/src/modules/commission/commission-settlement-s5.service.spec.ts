import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommissionEntryEntity } from '../../database/entities/commission-entry.entity';
import { CommissionSettlementRunEntity } from '../../database/entities/commission-settlement-run.entity';
import { CommissionSnapshotEntity } from '../../database/entities/commission-snapshot.entity';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import { KycService } from '../kyc/kyc.service';
import { CommissionPayoutClient } from './commission-payout.client';
import { CommissionSettlementService } from './commission-settlement.service';

const PILOT = 'ten_pilot_cdt_01';

describe('CommissionSettlementService OPS-S5', () => {
  let service: CommissionSettlementService;
  let entries: CommissionEntryEntity[];
  let runs: CommissionSettlementRunEntity[];

  beforeEach(async () => {
    entries = [
      {
        id: 'ce_pilot_agent01',
        tenantId: PILOT,
        snapshotId: 'cs_pilot_settle01',
        recipientType: 'USER',
        recipientId: 'usr_pilot_agent',
        role: 'PRIMARY',
        splitPercent: '70.000',
        amount: '1750000',
        payoutStatus: 'APPROVED',
        settlementRunId: null,
        createdAt: new Date('2026-08-01T10:00:00Z'),
      } as CommissionEntryEntity,
    ];
    runs = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionSettlementService,
        {
          provide: getRepositoryToken(CommissionEntryEntity),
          useValue: {
            find: jest.fn(async (opts: { where?: Record<string, unknown> }) => {
              const where = opts?.where ?? {};
              return entries.filter((e) => {
                if (where.tenantId && e.tenantId !== where.tenantId) return false;
                if (where.payoutStatus && e.payoutStatus !== where.payoutStatus) return false;
                if (where.settlementRunId === null && e.settlementRunId !== null) return false;
                if (
                  typeof where.settlementRunId === 'string' &&
                  e.settlementRunId !== where.settlementRunId
                )
                  return false;
                return true;
              });
            }),
            count: jest.fn(async () => 0),
            update: jest.fn(async (_where: unknown, patch: Partial<CommissionEntryEntity>) => {
              if (patch.payoutStatus) entries[0].payoutStatus = patch.payoutStatus;
              if (patch.settlementRunId !== undefined) entries[0].settlementRunId = patch.settlementRunId;
            }),
          },
        },
        {
          provide: getRepositoryToken(CommissionSettlementRunEntity),
          useValue: {
            find: jest.fn(async () => runs),
            findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
              runs.find((r) => r.id === where.id && r.tenantId === where.tenantId) ?? null,
            ),
            save: jest.fn(async (row: CommissionSettlementRunEntity) => {
              const saved = { ...row, createdAt: row.createdAt ?? new Date() };
              const idx = runs.findIndex((r) => r.id === saved.id);
              if (idx >= 0) runs[idx] = saved;
              else runs.push(saved);
              return saved;
            }),
          },
        },
        {
          provide: getRepositoryToken(CommissionSnapshotEntity),
          useValue: {
            find: jest.fn(async () => []),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        {
          provide: getRepositoryToken(AuditEventEntity),
          useValue: { find: jest.fn(async () => []) },
        },
        {
          provide: KycService,
          useValue: {
            assertEntriesPayoutEligible: jest.fn(),
            enrichEntry: jest.fn(async () => ({
              kycStatus: 'APPROVED',
              payoutEligible: true,
            })),
          },
        },
        {
          provide: CommissionPayoutClient,
          useValue: {
            isEnabled: jest.fn(async () => true),
            isStubMode: jest.fn(async () => false),
            submitBatch: jest.fn().mockImplementation(async ({ runId }: { runId: string }) => ({
              batchId: `pay_${runId}`,
              status: 'SUBMITTED',
              provider: 'partner-payout',
              lineCount: 1,
              totalAmount: 1_750_000,
            })),
          },
        },
      ],
    }).compile();

    service = module.get(CommissionSettlementService);
  });

  it('defers PAID until bank webhook on live payout tenant', async () => {
    const result = await service.createRun(PILOT, {
      label: 'Pilot close',
      entryIds: ['ce_pilot_agent01'],
    });

    expect(result.data.attributes.status).toBe('SUBMITTED');
    expect(entries[0].payoutStatus).toBe('APPROVED');

    const confirmed = await service.confirmPayoutFromBankWebhook(PILOT, {
      batchId: `pay_${result.data.id}`,
      amount: 1_750_000,
      status: 'SUCCESS',
      settlementRunId: result.data.id,
    });

    expect(confirmed.completed).toBe(true);
    expect(entries[0].payoutStatus).toBe('PAID');
    expect(runs[0].status).toBe('COMPLETED');
  });

  it('reconcilePayoutBatch returns MATCHED when bank amount equals run total', async () => {
    runs.push({
      id: 'sr_rec01',
      tenantId: PILOT,
      status: 'SUBMITTED',
      label: 'Rec test',
      periodFrom: null,
      periodTo: null,
      entryCount: 1,
      totalAmount: '1750000',
      createdBy: null,
      completedAt: null,
      lastError: null,
      createdAt: new Date(),
    });

    const result = await service.reconcilePayoutBatch(PILOT, 'sr_rec01', {
      batchId: 'pay_sr_rec01',
      bankAmount: 1_750_000,
    });

    expect(result.data.status).toBe('MATCHED');
    expect(result.data.amountMatched).toBe(true);
  });
});
