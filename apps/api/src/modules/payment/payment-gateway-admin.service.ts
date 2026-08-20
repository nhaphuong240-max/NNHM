import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import { TenantConfigService } from '../tenant-config/tenant-config.service';
import type { PaymentMethod } from '../../database/entities/payment-intent.entity';
import {
  type GatewayRouteRule,
  resolveGatewayRoute,
} from './payment-gateway-routing.util';

@Injectable()
export class PaymentGatewayAdminService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    private readonly audit: AuditService,
    private readonly tenantConfig: TenantConfigService,
  ) {}

  /** UC-PAY-05 · SCR-ADMIN-017 */
  async getRoutingConfig(tenantId: string) {
    const rules = await this.loadRules(tenantId);
    return {
      data: { rules },
      meta: {
        tenantId,
        count: rules.length,
        uc: ['UC-PAY-05'],
        screen: 'SCR-ADMIN-017',
        adapters: ['MOCK', 'VNPAY'],
      },
    };
  }

  async simulateRoute(
    tenantId: string,
    input: { method: PaymentMethod; amount: number; primaryFailed?: boolean },
    actorId?: string,
  ) {
    const rules = await this.loadRules(tenantId);
    const decision = resolveGatewayRoute(
      rules,
      { method: input.method, amount: input.amount },
      input.primaryFailed ?? false,
    );

    await this.audit.append({
      tenantId,
      entityType: 'payment_gateway_route',
      entityId: decision?.ruleId ?? 'none',
      action: 'SIMULATE',
      payload: {
        method: input.method,
        amount: input.amount,
        primaryFailed: input.primaryFailed ?? false,
        decision,
      },
      actorId: actorId ?? null,
    });

    return {
      data: { decision },
      meta: { uc: ['UC-PAY-05'], screen: 'SCR-ADMIN-017', mode: 'simulate' },
    };
  }

  async updateRule(
    tenantId: string,
    ruleId: string,
    patch: Partial<Pick<GatewayRouteRule, 'enabled' | 'fallback' | 'label'>>,
    actorId?: string,
  ) {
    const rules = await this.loadRules(tenantId);
    const idx = rules.findIndex((r) => r.id === ruleId);
    if (idx < 0) {
      return { data: null, meta: { error: 'rule_not_found' } };
    }

    rules[idx] = { ...rules[idx]!, ...patch };

    await this.tenantConfig.savePaymentGatewayRules(tenantId, rules, actorId);

    return {
      data: { rules },
      meta: { uc: ['UC-PAY-05'], screen: 'SCR-ADMIN-017', updatedRule: ruleId },
    };
  }

  /** Used by PaymentOrchestratorService (UC-PAY-05 live routing) */
  async resolveRules(tenantId: string): Promise<GatewayRouteRule[]> {
    return this.loadRules(tenantId);
  }

  private async loadRules(tenantId: string): Promise<GatewayRouteRule[]> {
    return this.tenantConfig.loadPaymentGatewayRules(tenantId);
  }
}
