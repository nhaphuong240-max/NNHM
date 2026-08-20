import { UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CommissionDisputeEntity } from '../../database/entities/commission-dispute.entity';
import { CommissionEntryEntity } from '../../database/entities/commission-entry.entity';
import { CommissionPolicyEntity } from '../../database/entities/commission-policy.entity';
import { CommissionSnapshotEntity } from '../../database/entities/commission-snapshot.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { CommissionPolicyService } from './commission-policy.service';
import { CommissionSnapshotService } from './commission-snapshot.service';

const TENANT = 'ten_dev_01';

describe('CommissionSnapshotService', () => {
  let service: CommissionSnapshotService;
  let snapshots: CommissionSnapshotEntity[];
  let entries: CommissionEntryEntity[];
  let disputes: CommissionDisputeEntity[];
  let bookings: BookingEntity[];
  let units: UnitEntity[];
  let policy: CommissionPolicyEntity;

  beforeEach(async () => {
    snapshots = [];
    entries = [];
    disputes = [];
    bookings = [
      {
        id: 'bk_com01',
        tenantId: TENANT,
        unitId: 'un_01',
        unitVersion: 1,
        leadId: 'ld_01',
        status: 'DEPOSITED',
        lockId: 'lock_bk_com01',
        lockToken: 'tok',
        expiresAt: new Date(Date.now() + 86400000),
        depositAmount: '50000000',
        notes: null,
        idempotencyKey: null,
        createdAt: new Date(),
      },
    ];
    units = [
      {
        id: 'un_01',
        tenantId: TENANT,
        projectId: 'prj_sunrise',
        code: 'A-01',
        floor: 1,
        area: '60',
        bedrooms: 2,
        basePrice: '3850000000',
        status: 'RESERVED',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UnitEntity,
    ];
    policy = {
      id: 'cp_seed01',
      tenantId: TENANT,
      projectId: 'prj_sunrise',
      version: 1,
      status: 'PUBLISHED',
      name: 'Seed policy',
      ratePercent: '2.500',
      baseType: 'DEPOSIT',
      splitRules: [
        { role: 'PRIMARY', recipientId: 'usr_agent_01', percent: 70 },
        { role: 'AGENCY', recipientId: 'agcy_sunrise', percent: 30 },
      ],
      effectiveFrom: null,
      effectiveTo: null,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const policyService: Pick<CommissionPolicyService, 'getActivePublished'> = {
      getActivePublished: jest.fn(async () => policy),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionSnapshotService,
        { provide: CommissionPolicyService, useValue: policyService },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        {
          provide: getRepositoryToken(BookingEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) =>
              bookings.find((b) => b.id === where.id && b.tenantId === where.tenantId) ?? null,
            ),
          },
        },
        {
          provide: getRepositoryToken(UnitEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) =>
              units.find((u) => u.id === where.id && u.tenantId === where.tenantId) ?? null,
            ),
          },
        },
        {
          provide: getRepositoryToken(CommissionSnapshotEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) => {
              if (where.id) {
                return (
                  snapshots.find((s) => s.id === where.id && s.tenantId === where.tenantId) ?? null
                );
              }
              if (where.bookingId) {
                return (
                  snapshots.find(
                    (s) => s.bookingId === where.bookingId && s.tenantId === where.tenantId,
                  ) ?? null
                );
              }
              return null;
            }),
            find: jest.fn(async () => snapshots),
            save: jest.fn(async (row: CommissionSnapshotEntity) => {
              const saved = { ...row, calculatedAt: row.calculatedAt ?? new Date() };
              const idx = snapshots.findIndex((s) => s.id === saved.id);
              if (idx >= 0) snapshots[idx] = saved;
              else snapshots.push(saved);
              return saved;
            }),
          },
        },
        {
          provide: getRepositoryToken(CommissionEntryEntity),
          useValue: {
            find: jest.fn(async ({ where }: { where: { snapshotId: string } }) =>
              entries.filter((e) => e.snapshotId === where.snapshotId),
            ),
            save: jest.fn(async (row: CommissionEntryEntity) => {
              entries.push({ ...row, createdAt: new Date() });
              return row;
            }),
            update: jest.fn(async (_where: unknown, patch: Partial<CommissionEntryEntity>) => {
              entries = entries.map((e) => ({ ...e, ...patch }));
              return { affected: entries.length };
            }),
          },
        },
        {
          provide: getRepositoryToken(CommissionDisputeEntity),
          useValue: {
            find: jest.fn(async ({ where }: { where: Record<string, string> }) =>
              disputes.filter(
                (d) =>
                  d.tenantId === where.tenantId &&
                  (!where.status || d.status === where.status),
              ),
            ),
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) =>
              disputes.find(
                (d) =>
                  d.id === where.id ||
                  (d.snapshotId === where.snapshotId &&
                    d.tenantId === where.tenantId &&
                    (!where.status || d.status === where.status)),
              ) ?? null,
            ),
            save: jest.fn(async (row: CommissionDisputeEntity) => {
              const saved = { ...row, openedAt: row.openedAt ?? new Date() };
              disputes.push(saved);
              return saved;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(CommissionSnapshotService);
  });

  it('creates snapshot with split lines summing to 100% (S5-02, S5-03)', async () => {
    const result = await service.closeDeal(TENANT, 'bk_com01');

    expect(result.data.attributes.policyHash).toHaveLength(64);
    expect(result.data.attributes.totalCommission).toBe(1_250_000);
    expect(result.entries).toHaveLength(2);
    expect(result.meta?.splitTotalPercent).toBe(100);
    expect(entries.every((e) => e.payoutStatus === 'PENDING')).toBe(true);
  });

  it('blocks payout on holdback and releases after resolve (S5-04)', async () => {
    const closed = await service.closeDeal(TENANT, 'bk_com01');
    const hold = await service.openHoldback(TENANT, closed.data.id, { reason: 'Split dispute' });

    expect(hold.data.attributes.status).toBe('OPEN');
    expect(snapshots[0].status).toBe('HOLDBACK');
    expect(entries.every((e) => e.payoutStatus === 'HOLDBACK')).toBe(true);

    await service.resolveHoldback(TENANT, closed.data.id, hold.data.id);
    expect(snapshots[0].status).toBe('RELEASED');
    expect(entries.every((e) => e.payoutStatus === 'PENDING')).toBe(true);
  });

  it('lists disputes with booking id (UC-COM-04 / SCR-ADMIN-007)', async () => {
    const closed = await service.closeDeal(TENANT, 'bk_com01');
    await service.openHoldback(TENANT, closed.data.id, { reason: 'Ops review' });

    const result = await service.listDisputes(TENANT, 'OPEN');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].attributes.bookingId).toBe('bk_com01');
    expect(result.data[0].attributes.status).toBe('OPEN');
  });

  it('rejects close deal when booking is not DEPOSITED', async () => {
    bookings[0].status = 'RESERVED';
    await expect(service.closeDeal(TENANT, 'bk_com01')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });
});
