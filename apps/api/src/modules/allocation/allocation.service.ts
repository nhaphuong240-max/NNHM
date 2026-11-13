import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { DistributionAgreementEntity } from '../../database/entities/distribution-agreements.entity';
import { UnitAllocationEntity } from '../../database/entities/unit-allocations.entity';
import { allocationAllowsPlacement } from '../spec-target/spec-target.rules';

/** D01 unsigned: only the developer admin of the stock-owning tenant may grant or revoke. */
export const ALLOCATION_WRITER_ROLE = 'DEVELOPER_ADMIN';

export function assertAllocationWriter(role: string | undefined): void {
  if (role !== ALLOCATION_WRITER_ROLE) {
    throw new ForbiddenException({ detail: 'allocation changes require a developer admin' });
  }
}

@Injectable()
export class AllocationService {
  constructor(
    @InjectRepository(DistributionAgreementEntity)
    private readonly agreements: Repository<DistributionAgreementEntity>,
    @InjectRepository(UnitAllocationEntity)
    private readonly allocations: Repository<UnitAllocationEntity>,
  ) {}

  async grant(input: {
    tenantId: string;
    actorRole: string | undefined;
    agreementId: string;
    unitId: string;
    expiresAt: Date;
  }): Promise<UnitAllocationEntity> {
    assertAllocationWriter(input.actorRole);
    const agreementId = input.agreementId.trim();
    const unitId = input.unitId.trim();
    if (!agreementId || !unitId) {
      throw new UnprocessableEntityException({ detail: 'agreement and unit are required' });
    }
    if (Number.isNaN(input.expiresAt.getTime()) || input.expiresAt.getTime() <= Date.now()) {
      throw new UnprocessableEntityException({ detail: 'allocation expiry must be in the future' });
    }
    const agreement = await this.agreements.findOne({
      where: { id: agreementId, tenantId: input.tenantId },
    });
    if (!agreement) throw new NotFoundException({ detail: 'distribution agreement not found' });
    if (agreement.stockOwnerTenantId !== input.tenantId) {
      throw new ForbiddenException({ detail: 'allocation requires the stock owner tenant' });
    }
    if (agreement.status !== 'ACTIVE') {
      throw new UnprocessableEntityException({ detail: 'distribution agreement is not active' });
    }
    const existing = await this.allocations.findOne({
      where: { tenantId: input.tenantId, agreementId, unitId },
    });
    if (existing) {
      throw new ConflictException({ detail: 'unit allocation already exists' });
    }
    return this.allocations.save(
      this.allocations.create({
        id: `ual_${randomBytes(12).toString('hex')}`,
        tenantId: input.tenantId,
        agreementId,
        unitId,
        expiresAt: input.expiresAt,
        status: 'ACTIVE',
        payload: {},
      }),
    );
  }

  async revoke(input: {
    tenantId: string;
    actorRole: string | undefined;
    allocationId: string;
  }): Promise<UnitAllocationEntity> {
    assertAllocationWriter(input.actorRole);
    const row = await this.allocations.findOne({
      where: { id: input.allocationId, tenantId: input.tenantId },
    });
    if (!row) throw new NotFoundException({ detail: 'unit allocation not found' });
    if (row.status !== 'ACTIVE') {
      throw new ConflictException({ detail: 'unit allocation is not active' });
    }
    row.status = 'REVOKED';
    return this.allocations.save(row);
  }

  async placement(input: {
    tenantId: string;
    agreementId: string;
    unitId: string;
    now: Date;
  }): Promise<{ allowed: boolean }> {
    const row = await this.allocations.findOne({
      where: {
        tenantId: input.tenantId,
        agreementId: input.agreementId.trim(),
        unitId: input.unitId.trim(),
      },
    });
    if (!row) return { allowed: false };
    return {
      allowed: allocationAllowsPlacement({
        status: row.status,
        expiresAt: row.expiresAt,
        now: input.now,
        unitId: row.unitId,
        requestedUnitId: input.unitId.trim(),
      }),
    };
  }
}
