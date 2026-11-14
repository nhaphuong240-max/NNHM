import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CustomerEntity } from '../../database/entities/customers.entity';
import { DedupReviewEntity } from '../../database/entities/dedup-reviews.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { DedupReviewService, phoneHash } from './dedup-review.service';

function leads(rows: LeadEntity[]) {
  return {
    findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
      rows.find((row) => row.id === where.id && row.tenantId === where.tenantId) ?? null,
    ),
    save: jest.fn(),
  };
}

function customers(rows: CustomerEntity[]) {
  return {
    find: jest.fn(async ({ where }: { where: { tenantId: string; phoneHash: string } }) =>
      rows.filter((row) => row.tenantId === where.tenantId && row.phoneHash === where.phoneHash),
    ),
  };
}

function reviews(rows: DedupReviewEntity[]) {
  return {
    findOne: jest.fn(
      async ({
        where,
      }: {
        where: { id?: string; tenantId: string; customerId?: string; leadId?: string };
      }) =>
        rows.find((row) => {
          if (row.tenantId !== where.tenantId) return false;
          if (where.id && row.id !== where.id) return false;
          if (where.customerId && row.customerId !== where.customerId) return false;
          if (where.leadId && row.leadId !== where.leadId) return false;
          return Boolean(where.id || (where.customerId && where.leadId));
        }) ?? null,
    ),
    create: jest.fn((row: DedupReviewEntity) => row),
    save: jest.fn(async (row: DedupReviewEntity) => {
      const index = rows.findIndex((item) => item.id === row.id);
      if (index >= 0) rows[index] = row;
      else rows.push(row);
      return row;
    }),
  };
}

describe('dedup review queue', () => {
  const hotLead = {
    id: 'ld_hot',
    tenantId: 'ten_a',
    phone: '0900000001',
    tier: 'HOT',
    assignedTo: null,
  } as LeadEntity;

  it('queues a matching phone and leaves the HOT lead unassigned', async () => {
    const hash = phoneHash('84900000001');
    const leadRepo = leads([hotLead]);
    const reviewRows: DedupReviewEntity[] = [];
    const service = new DedupReviewService(
      leadRepo as never,
      customers([
        {
          id: 'cus_a',
          tenantId: 'ten_a',
          phoneHash: hash as string,
          displayName: 'Hidden',
          status: 'ACTIVE',
          payload: {},
          createdAt: new Date(),
        },
        {
          id: 'cus_b',
          tenantId: 'ten_b',
          phoneHash: hash as string,
          displayName: 'Other tenant',
          status: 'ACTIVE',
          payload: {},
          createdAt: new Date(),
        },
      ]) as never,
      reviews(reviewRows) as never,
    );
    const first = await service.enqueue({ tenantId: 'ten_a', leadId: 'ld_hot' });
    expect(first.queued).toBe(true);
    expect(first.reviewIds).toHaveLength(1);
    expect(first.assignedTo).toBeNull();
    expect(leadRepo.save).not.toHaveBeenCalled();
    expect(reviewRows[0].status).toBe('PENDING');
    expect(reviewRows[0].payload).toEqual({ needsHumanApproval: true });
    expect(JSON.stringify(reviewRows[0].payload)).not.toContain('0900000001');
    const second = await service.enqueue({ tenantId: 'ten_a', leadId: 'ld_hot' });
    expect(second.reviewIds).toEqual(first.reviewIds);
    expect(reviewRows).toHaveLength(1);
  });

  it('does not queue a short phone or a lead from another tenant', async () => {
    const leadRepo = leads([
      { ...hotLead, id: 'ld_short', phone: '123' },
    ]);
    const service = new DedupReviewService(leadRepo as never, customers([]) as never, reviews([]) as never);
    await expect(service.enqueue({ tenantId: 'ten_a', leadId: 'ld_short' })).resolves.toEqual({
      queued: false,
      reviewIds: [],
      assignedTo: null,
    });
    await expect(service.enqueue({ tenantId: 'ten_b', leadId: 'ld_hot' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lets an operator mark the pair distinct and refuses a sales user', async () => {
    const row: DedupReviewEntity = {
      id: 'ddr_a',
      tenantId: 'ten_a',
      customerId: 'cus_a',
      leadId: 'ld_hot',
      status: 'PENDING',
      payload: { needsHumanApproval: true },
      createdAt: new Date(),
    };
    const service = new DedupReviewService(leads([]) as never, customers([]) as never, reviews([row]) as never);
    await expect(
      service.markDistinct({ tenantId: 'ten_a', reviewId: 'ddr_a', actorRole: 'AGENT' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.markDistinct({ tenantId: 'ten_b', reviewId: 'ddr_a', actorRole: 'OPS_ADMIN' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    const saved = await service.markDistinct({
      tenantId: 'ten_a',
      reviewId: 'ddr_a',
      actorRole: 'OPS_ADMIN',
    });
    expect(saved.status).toBe('DISTINCT');
    await expect(
      service.markDistinct({ tenantId: 'ten_a', reviewId: 'ddr_a', actorRole: 'DEVELOPER_ADMIN' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
