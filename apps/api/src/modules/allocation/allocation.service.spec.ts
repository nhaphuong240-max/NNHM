import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DistributionAgreementEntity } from '../../database/entities/distribution-agreements.entity';
import { UnitAllocationEntity } from '../../database/entities/unit-allocations.entity';
import { AllocationService } from './allocation.service';

function agreements(rows: DistributionAgreementEntity[]) {
  return {
    findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
      rows.find((row) => row.id === where.id && row.tenantId === where.tenantId) ?? null,
    ),
  };
}

function allocations(rows: UnitAllocationEntity[]) {
  return {
    findOne: jest.fn(
      async ({
        where,
      }: {
        where: { id?: string; tenantId: string; agreementId?: string; unitId?: string };
      }) =>
        rows.find((row) => {
          if (row.tenantId !== where.tenantId) return false;
          if (where.id && row.id !== where.id) return false;
          if (where.agreementId && row.agreementId !== where.agreementId) return false;
          if (where.unitId && row.unitId !== where.unitId) return false;
          return true;
        }) ?? null,
    ),
    create: jest.fn((row: UnitAllocationEntity) => row),
    save: jest.fn(async (row: UnitAllocationEntity) => {
      const index = rows.findIndex((item) => item.id === row.id);
      if (index >= 0) rows[index] = row;
      else rows.push(row);
      return row;
    }),
  };
}

describe('unit allocation placement', () => {
  const later = new Date(Date.now() + 60 * 60 * 1000);
  const agreement: DistributionAgreementEntity = {
    id: 'agr_a',
    tenantId: 'ten_a',
    projectId: 'prj_a',
    partnerOrgId: 'org_partner',
    stockOwnerTenantId: 'ten_a',
    status: 'ACTIVE',
    payload: {},
    createdAt: new Date(),
  };

  it('rejects a sales role, a foreign stock owner, and an inactive agreement', async () => {
    const service = new AllocationService(
      agreements([
        agreement,
        { ...agreement, id: 'agr_other_owner', stockOwnerTenantId: 'ten_cdt' },
        { ...agreement, id: 'agr_paused', status: 'PAUSED' },
      ]) as never,
      allocations([]) as never,
    );
    await expect(
      service.grant({
        tenantId: 'ten_a',
        actorRole: 'AGENT',
        agreementId: 'agr_a',
        unitId: 'un_a',
        expiresAt: later,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.grant({
        tenantId: 'ten_a',
        actorRole: 'DEVELOPER_ADMIN',
        agreementId: 'agr_missing',
        unitId: 'un_a',
        expiresAt: later,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.grant({
        tenantId: 'ten_a',
        actorRole: 'DEVELOPER_ADMIN',
        agreementId: 'agr_other_owner',
        unitId: 'un_a',
        expiresAt: later,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.grant({
        tenantId: 'ten_a',
        actorRole: 'DEVELOPER_ADMIN',
        agreementId: 'agr_paused',
        unitId: 'un_a',
        expiresAt: later,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('grants one active row and refuses a second grant for the same unit', async () => {
    const store: UnitAllocationEntity[] = [];
    const service = new AllocationService(agreements([agreement]) as never, allocations(store) as never);
    const saved = await service.grant({
      tenantId: 'ten_a',
      actorRole: 'DEVELOPER_ADMIN',
      agreementId: 'agr_a',
      unitId: 'un_a',
      expiresAt: later,
    });
    expect(saved.tenantId).toBe('ten_a');
    expect(saved.status).toBe('ACTIVE');
    expect(saved.unitId).toBe('un_a');
    await expect(
      service.grant({
        tenantId: 'ten_a',
        actorRole: 'DEVELOPER_ADMIN',
        agreementId: 'agr_a',
        unitId: 'un_a',
        expiresAt: later,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows placement only while the same unit is active, then blocks it after revoke', async () => {
    const row: UnitAllocationEntity = {
      id: 'ual_a',
      tenantId: 'ten_a',
      agreementId: 'agr_a',
      unitId: 'un_a',
      expiresAt: later,
      status: 'ACTIVE',
      payload: {},
      createdAt: new Date(),
    };
    const service = new AllocationService(agreements([agreement]) as never, allocations([row]) as never);
    await expect(
      service.placement({ tenantId: 'ten_b', agreementId: 'agr_a', unitId: 'un_a', now: new Date() }),
    ).resolves.toEqual({ allowed: false });
    await expect(
      service.placement({ tenantId: 'ten_a', agreementId: 'agr_a', unitId: 'un_other', now: new Date() }),
    ).resolves.toEqual({ allowed: false });
    await expect(
      service.placement({ tenantId: 'ten_a', agreementId: 'agr_a', unitId: 'un_a', now: new Date() }),
    ).resolves.toEqual({ allowed: true });
    await expect(
      service.revoke({ tenantId: 'ten_a', actorRole: 'AGENT', allocationId: 'ual_a' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const revoked = await service.revoke({
      tenantId: 'ten_a',
      actorRole: 'DEVELOPER_ADMIN',
      allocationId: 'ual_a',
    });
    expect(revoked.status).toBe('REVOKED');
    await expect(
      service.placement({ tenantId: 'ten_a', agreementId: 'agr_a', unitId: 'un_a', now: new Date() }),
    ).resolves.toEqual({ allowed: false });
  });
});
