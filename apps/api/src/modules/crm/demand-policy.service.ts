import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantDemandPolicyEntity } from '../../database/entities/tenant-demand-policy.entity';
import { AuditService } from '../audit/audit.service';
import {
  DEFAULT_TENANT_DEMAND_POLICY,
  type TenantDemandPolicyPatch,
  type TenantDemandPolicyPayload,
} from './demand-policy.types';

@Injectable()
export class DemandPolicyService {
  constructor(
    @InjectRepository(TenantDemandPolicyEntity)
    private readonly policies: Repository<TenantDemandPolicyEntity>,
    private readonly audit: AuditService,
  ) {}

  async getPolicy(tenantId: string) {
    const row = await this.policies.findOne({ where: { tenantId } });
    const payload = row?.payload ?? { ...DEFAULT_TENANT_DEMAND_POLICY };
    return {
      data: {
        attributes: {
          tenantId,
          version: row?.version ?? 0,
          payload,
          isDefault: !row,
        },
      },
      meta: { uc: 'UC-CRM-POLICY', schema: 'TenantDemandPolicyPayload v1' },
    };
  }

  async patchPolicy(
    tenantId: string,
    patch: TenantDemandPolicyPatch,
    actorId?: string,
  ) {
    const current = await this.policies.findOne({ where: { tenantId } });
    const base = current?.payload ?? { ...DEFAULT_TENANT_DEMAND_POLICY };
    const next: TenantDemandPolicyPayload = {
      ...base,
      ...patch,
      schemaVersion: 1,
      dealProtection: { ...base.dealProtection, ...patch.dealProtection },
      sla: { ...base.sla, ...patch.sla },
      search: { ...base.search, ...patch.search },
      alerts: { ...base.alerts, ...patch.alerts },
    };

    const version = (current?.version ?? 0) + 1;
    const row = await this.policies.save({
      tenantId,
      version,
      payload: next,
      updatedBy: actorId ?? null,
    });

    await this.audit.append({
      tenantId,
      entityType: 'tenant_demand_policy',
      entityId: tenantId,
      action: 'PATCH',
      payload: { version, dealProtectionPolicyId: next.dealProtectionPolicyId },
      actorId: actorId ?? null,
    });

    return {
      data: {
        attributes: {
          tenantId,
          version: row.version,
          payload: row.payload,
          isDefault: false,
        },
      },
    };
  }
}
