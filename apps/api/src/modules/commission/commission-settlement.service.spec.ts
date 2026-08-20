import { UnprocessableEntityException } from '@nestjs/common';
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

const TENANT = 'ten_dev_01';

function idsFromWhere(idField: unknown): string[] | null {
  if (typeof idField === 'string') return [idField];
  if (idField && typeof idField === 'object' && 'value' in idField) {
    return (idField as { value: string[] }).value;
  }
  return null;
}

describe('CommissionSettlementService', () => {
  let service: CommissionSettlementService;
  let entries: CommissionEntryEntity[];
  let runs: CommissionSettlementRunEntity[];
  let snapshots: CommissionSnapshotEntity[];

  beforeEach(async () => {
    entries = [
      {
        id: 'ce_a',
        tenantId: TENANT,
        snapshotId: 'cs_01',
        recipientType: 'USER',
        recipientId: 'usr_agent_01',
        role: 'PRIMARY',
        splitPercent: '70.000',
        amount: '1750000',
        payoutStatus: 'PENDING',
        settlementRunId: null,
        createdAt: new Date('2026-07-01T10:00:00Z'),
      } as CommissionEntryEntity,
      {
        id: 'ce_b',
        tenantId: TENANT,
        snapshotId: 'cs_01',
        recipientType: 'AGENCY',
        recipientId: 'agcy_sunrise',
        role: 'AGENCY',
        splitPercent: '30.000',
        amount: '750000',
        payoutStatus: 'PENDING',
        settlementRunId: null,
        createdAt: new Date('2026-07-01T10:00:00Z'),
      } as CommissionEntryEntity,
    ];
    runs = [];
    snapshots = [
      {
        id: 'cs_01',
        tenantId: TENANT,
        bookingId: 'bk_settle01',
        policyId: 'cp_sunrise_v1',
        policyVersion: 1,
        policyHash: 'hash',
        dealAmount: '100000000',
        totalCommission: '2500000',
        status: 'CALCULATED',
        calculatedAt: new Date(),
      } as CommissionSnapshotEntity,
    ];

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
                const ids = idsFromWhere(where.id);
                if (ids && !ids.includes(e.id)) return false;
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
            count: jest.fn(async (opts: { where?: Record<string, unknown> }) => {
              const where = opts?.where ?? {};
              return entries.filter((e) => {
                if (where.tenantId && e.tenantId !== where.tenantId) return false;
                if (where.snapshotId && e.snapshotId !== where.snapshotId) return false;
                const statuses = idsFromWhere(where.payoutStatus);
                if (statuses && !statuses.includes(e.payoutStatus)) return false;
                return true;
              }).length;
            }),
            update: jest.fn(async (where: { tenantId?: string; id?: unknown }, patch: Partial<CommissionEntryEntity>) => {
              const ids = idsFromWhere(where.id);
              for (const row of entries) {
                if (where.tenantId && row.tenantId !== where.tenantId) continue;
                if (ids && !ids.includes(row.id)) continue;
                if (patch.payoutStatus) row.payoutStatus = patch.payoutStatus;
                if (patch.settlementRunId !== undefined) row.settlementRunId = patch.settlementRunId;
              }
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
              const saved = {
                ...row,
                createdAt: row.createdAt ?? new Date(),
              };
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
            find: jest.fn(async () => snapshots),
            findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
              snapshots.find((s) => s.id === where.id && s.tenantId === where.tenantId) ?? null,
            ),
            save: jest.fn(async (row: CommissionSnapshotEntity) => {
              const idx = snapshots.findIndex((s) => s.id === row.id);
              if (idx >= 0) snapshots[idx] = row;
              return row;
            }),
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
            assertEntriesPayoutEligible: jest.fn(async (_tenantId, rows: CommissionEntryEntity[]) => {
              const blocked = rows.filter((r) => r.recipientId === 'agcy_sunrise');
              if (blocked.length > 0) {
                throw new UnprocessableEntityException({
                  detail: 'BR-23: KYC/KYB phải APPROVED trước khi duyệt chi HH',
                  code: 'KYC_PAYOUT_BLOCKED',
                });
              }
            }),
            enrichEntry: jest.fn(async (_tenantId, entry: CommissionEntryEntity) => ({
              kycStatus: entry.recipientId === 'agcy_sunrise' ? 'PENDING' : 'APPROVED',
              payoutEligible: entry.recipientId !== 'agcy_sunrise',
              kycSubjectType: entry.recipientType === 'AGENCY' ? 'AGENCY' : 'USER',
            })),
          },
        },
        {
          provide: CommissionPayoutClient,
          useValue: {
            isEnabled: jest.fn(async () => false),
            isStubMode: jest.fn(async () => true),
            submitBatch: jest.fn().mockResolvedValue({
              batchId: 'pay_sr_test',
              status: 'SKIPPED',
              provider: 'internal-db-only',
              lineCount: 1,
              totalAmount: 1_750_000,
            }),
          },
        },
      ],
    }).compile();

    service = module.get(CommissionSettlementService);
  });

  it('blocks approve when recipient KYC pending (BR-23)', async () => {
    await expect(
      service.approveLines(TENANT, { entryIds: ['ce_a', 'ce_b'] }),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(entries.every((e) => e.payoutStatus === 'PENDING')).toBe(true);
  });

  it('approves KYC-verified lines only', async () => {
    const result = await service.approveLines(TENANT, { entryIds: ['ce_a'] });
    expect(result.meta.approvedCount).toBe(1);
    expect(entries.find((e) => e.id === 'ce_a')?.payoutStatus).toBe('APPROVED');
    expect(entries.find((e) => e.id === 'ce_b')?.payoutStatus).toBe('PENDING');
  });

  it('runs settlement batch for KYC-ready approved lines', async () => {
    await service.approveLines(TENANT, { entryIds: ['ce_a'] });
    const result = await service.createRun(TENANT, { label: 'July close', entryIds: ['ce_a'] });

    expect(result.data.attributes.status).toBe('COMPLETED');
    expect(result.data.attributes.totalAmount).toBe(1_750_000);
    expect(entries.find((e) => e.id === 'ce_a')?.payoutStatus).toBe('PAID');
    expect(entries.find((e) => e.id === 'ce_b')?.payoutStatus).toBe('PENDING');
    expect(runs[0].entryCount).toBe(1);
  });
});
