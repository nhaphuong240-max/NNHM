import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessErrorCode, throwBusinessError } from '../../common/business-error';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { DemandPolicyService } from './demand-policy.service';
import type { TenantDemandPolicyPayload } from './demand-policy.types';

export type LeadRequirement = {
  budget?: number;
  timeline?: string;
  loanIntent?: 'cash' | 'bank_loan' | 'mixed' | 'unknown';
};

@Injectable()
export class QualificationService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    private readonly policy: DemandPolicyService,
  ) {}

  async resolveQualificationPolicy(tenantId: string, projectId?: string | null) {
    const base = await this.policy.resolvePayload(tenantId);
    if (!projectId) return base.qualification;
    const project = await this.projects.findOne({ where: { id: projectId, tenantId } });
    const override = (project?.demandPolicyOverride ?? {}) as Record<string, unknown>;
    const qualOverride = override.qualification as Partial<
      TenantDemandPolicyPayload['qualification']
    > | undefined;
    return {
      ...base.qualification,
      ...qualOverride,
      requiredFields: qualOverride?.requiredFields ?? base.qualification.requiredFields,
    };
  }

  missingFields(requirement: LeadRequirement | null | undefined, required: string[]) {
    const req = requirement ?? {};
    const missing: string[] = [];
    for (const field of required) {
      if (field === 'budget' && (req.budget === undefined || req.budget <= 0)) missing.push(field);
      if (field === 'timeline' && !req.timeline?.trim()) missing.push(field);
      if (field === 'loanIntent' && !req.loanIntent) missing.push(field);
    }
    return missing;
  }

  async assertLeadQualifiedForBooking(tenantId: string, lead: LeadEntity) {
    const qual = await this.resolveQualificationPolicy(tenantId, lead.projectId);
    if (!qual.requireBeforeBooking) return;
    const missing = this.missingFields(lead.requirement as LeadRequirement, qual.requiredFields);
    if (missing.length) {
      throwBusinessError(
        BusinessErrorCode.QUALIFICATION_INCOMPLETE,
        `Missing qualification fields: ${missing.join(', ')}`,
        { missingFields: missing },
      );
    }
  }

  async patchRequirement(
    tenantId: string,
    leadId: string,
    requirement: LeadRequirement,
  ) {
    const lead = await this.leads.findOne({ where: { id: leadId, tenantId } });
    if (!lead) {
      throwBusinessError(BusinessErrorCode.NOT_FOUND, `Lead ${leadId} not found`);
    }
    lead.requirement = { ...(lead.requirement ?? {}), ...requirement };
    await this.leads.save(lead);
    return { data: { id: lead.id, requirement: lead.requirement } };
  }
}
