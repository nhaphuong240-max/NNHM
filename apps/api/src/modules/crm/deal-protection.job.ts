import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadRegistrationEntity } from '../../database/entities/lead-registration.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { AuditService } from '../audit/audit.service';
import { DemandPolicyService } from './demand-policy.service';

/** P0 FR-DP-002b — cooling-off, expiry, revival audit. */
@Injectable()
export class DealProtectionJob {
  private readonly logger = new Logger(DealProtectionJob.name);

  constructor(
    @InjectRepository(LeadRegistrationEntity)
    private readonly registrations: Repository<LeadRegistrationEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    private readonly policy: DemandPolicyService,
    private readonly audit: AuditService,
  ) {}

  @Cron('0 15 3 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runNightly() {
    const tenants = await this.tenants.find({ where: { isActive: true }, take: 50 });
    for (const t of tenants) {
      await this.processTenant(t.id);
    }
  }

  async processTenant(tenantId: string) {
    const basePayload = await this.policy.resolvePayload(tenantId);
    const now = new Date();

    const active = await this.registrations.find({
      where: { tenantId, status: 'ACCEPTED' },
      take: 500,
    });

    let expired = 0;
    let revived = 0;

    for (const reg of active) {
      const project = reg.projectId
        ? await this.projects.findOne({ where: { id: reg.projectId, tenantId } })
        : null;
      const override = (project?.demandPolicyOverride ?? {}) as Record<string, number>;
      const regPolicy = {
        ...basePayload,
        dealProtection: {
          ...basePayload.dealProtection,
          coolingOffDaysInactive:
            override.coolingOffDaysInactive ?? basePayload.dealProtection.coolingOffDaysInactive,
          revivalDaysAfterExpiry:
            override.revivalDaysAfterExpiry ?? basePayload.dealProtection.revivalDaysAfterExpiry,
          protectionDays:
            override.protectionDays ?? basePayload.dealProtection.protectionDays,
        },
      };
      const coolingMs = regPolicy.dealProtection.coolingOffDaysInactive * 24 * 60 * 60 * 1000;
      const revivalMs = regPolicy.dealProtection.revivalDaysAfterExpiry * 24 * 60 * 60 * 1000;

      if (reg.protectedUntil > now) continue;

      const inactiveSince = reg.updatedAt.getTime();
      if (now.getTime() - inactiveSince > coolingMs) {
        reg.status = 'EXPIRED';
        await this.registrations.save(reg);
        expired += 1;
        await this.audit.append({
          tenantId,
          entityType: 'lead_registration',
          entityId: reg.id,
          action: 'PROTECTION_EXPIRED',
          payload: { policyVersion: regPolicy.dealProtectionPolicyId, projectId: reg.projectId },
          actorId: null,
        });
        continue;
      }

      if (now.getTime() - reg.protectedUntil.getTime() <= revivalMs) {
        reg.protectedUntil = new Date(
          now.getTime() + regPolicy.dealProtection.protectionDays * 24 * 60 * 60 * 1000,
        );
        reg.status = 'ACCEPTED';
        await this.registrations.save(reg);
        revived += 1;
        await this.audit.append({
          tenantId,
          entityType: 'lead_registration',
          entityId: reg.id,
          action: 'PROTECTION_REVIVAL',
          payload: { protectedUntil: reg.protectedUntil.toISOString() },
          actorId: null,
        });
      }
    }

    if (expired || revived) {
      this.logger.log(`Deal protection ${tenantId}: expired=${expired} revived=${revived}`);
    }
  }
}
