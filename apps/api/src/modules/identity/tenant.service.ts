import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from '../../database/entities/tenant.entity';
import type { CreateTenantInput, TenantRecord } from './identity.types';

function mapTenant(row: TenantEntity): TenantRecord {
  return {
    id: row.id,
    attributes: {
      name: row.name,
      type: row.type,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    },
  };
}

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
  ) {}

  /** Public tenant picker for SCR-AUTH-001 login */
  async listPublicTenants(): Promise<{ data: TenantRecord[]; meta: { count: number } }> {
    const rows = await this.tenants.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return { data: rows.map(mapTenant), meta: { count: rows.length } };
  }

  async getTenant(tenantId: string): Promise<{ data: TenantRecord }> {
    const row = await this.tenants.findOne({ where: { id: tenantId } });
    if (!row) {
      throw new NotFoundException({ detail: `Tenant ${tenantId} not found` });
    }
    return { data: mapTenant(row) };
  }

  /** S1-03 / UC-ID-01 onboarding stub */
  async createTenant(input: CreateTenantInput): Promise<{ data: TenantRecord }> {
    const slug = (input.slug ?? input.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24);
    const id = `ten_${slug || 'new'}`;

    const existing = await this.tenants.findOne({ where: { id } });
    if (existing) {
      throw new ConflictException({
        detail: `Tenant slug already exists: ${id}`,
        tenantId: id,
      });
    }

    const saved = await this.tenants.save({
      id,
      name: input.name.trim(),
      type: input.type,
      isActive: true,
    });

    return { data: mapTenant(saved) };
  }
}
