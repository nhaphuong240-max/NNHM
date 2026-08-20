import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { AuditService } from '../audit/audit.service';
import {
  DEFAULT_BRAND,
  normalizeSubdomain,
  type TenantBrandConfig,
} from './tenant-branding.util';

@Injectable()
export class TenantBrandingService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    private readonly audit: AuditService,
  ) {}

  /** UC-UX-05 · SCR-ADMIN-022 */
  async getBrand(tenantId: string) {
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    const saved = await this.loadBrand(tenantId);
    const data: TenantBrandConfig = saved ?? {
      tenantId,
      displayName: tenant?.name ?? DEFAULT_BRAND.displayName,
      subdomain: normalizeSubdomain(tenant?.name ?? tenantId),
      primaryColor: DEFAULT_BRAND.primaryColor,
      accentColor: DEFAULT_BRAND.accentColor,
      live: false,
      whiteLabelTier: 'STANDARD',
      updatedAt: new Date().toISOString(),
    };

    return {
      data,
      meta: { uc: ['UC-UX-05', 'T6-S1'], screen: 'SCR-ADMIN-022', tenantId },
    };
  }

  async updateBrand(
    tenantId: string,
    patch: Partial<Omit<TenantBrandConfig, 'tenantId' | 'updatedAt'>>,
    actorId?: string,
  ) {
    const current = (await this.getBrand(tenantId)).data;
    const next: TenantBrandConfig = {
      ...current,
      ...patch,
      subdomain: patch.subdomain ? normalizeSubdomain(patch.subdomain) : current.subdomain,
      updatedAt: new Date().toISOString(),
    };

    await this.audit.append({
      tenantId,
      entityType: 'tenant_brand',
      entityId: tenantId,
      action: 'UPDATE',
      payload: { brand: next },
      actorId: actorId ?? null,
    });

    return { data: next, meta: { uc: ['UC-UX-05'], screen: 'SCR-ADMIN-022' } };
  }

  private async loadBrand(tenantId: string): Promise<TenantBrandConfig | null> {
    const row = await this.auditEvents.findOne({
      where: { tenantId, entityType: 'tenant_brand', action: 'UPDATE' },
      order: { createdAt: 'DESC' },
    });
    const payload = (row?.payload ?? {}) as {
      brand?: TenantBrandConfig;
      customDomain?: string;
    };
    const brand = payload.brand ?? null;
    if (!brand) return null;
    if (!brand.customDomain && payload.customDomain) {
      return { ...brand, customDomain: payload.customDomain };
    }
    return brand;
  }
}
