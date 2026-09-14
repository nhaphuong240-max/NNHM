import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AiLeadCopilotDraftEntity } from '../../database/entities/ai-lead-copilot-draft.entity';
import { CrmActivityEntity } from '../../database/entities/crm-activity.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { ViewingEntity } from '../../database/entities/viewing.entity';
import { AuditService } from '../audit/audit.service';
import { GoldenRecordService } from '../golden-record/golden-record.service';
import { assertCopilotGuardrails } from './copilot.guardrails';
import type {
  CopilotGenerateInput,
  CopilotGenerateResult,
  CopilotTone,
  ListingCopilotContext,
} from './copilot.types';
import { COPILOT_DISCLAIMER } from './copilot.types';
import {
  generateLeadCopilotBrief,
  LEAD_COPILOT_MODEL_VERSION,
} from './lead-copilot.engine';
import { COPILOT_MODEL_VERSION, generateListingCopilotCopy } from './listing-copilot.engine';

const LEAD_COPILOT_DISCLAIMER =
  'Copilot gợi ý — mọi tin nhắn outbound cần agent duyệt trước gửi (FR-AI-002).';

@Injectable()
export class CopilotService {
  constructor(
    private readonly gr: GoldenRecordService,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(ViewingEntity)
    private readonly viewings: Repository<ViewingEntity>,
    @InjectRepository(CrmActivityEntity)
    private readonly activities: Repository<CrmActivityEntity>,
    @InjectRepository(AiLeadCopilotDraftEntity)
    private readonly drafts: Repository<AiLeadCopilotDraftEntity>,
    private readonly audit: AuditService,
  ) {}

  status() {
    return {
      module: 'ai-copilot',
      uc: 'UC-AI-01',
      fr: ['FR-AI-01', 'FR-AI-002', 'FR-AI-03', 'FR-AI-04'],
      rules: ['BR-06', 'BR-16'],
      modelVersion: COPILOT_MODEL_VERSION,
      leadModelVersion: LEAD_COPILOT_MODEL_VERSION,
    };
  }

  async generate(
    tenantId: string,
    input: CopilotGenerateInput,
    actorId?: string,
  ): Promise<{ data: CopilotGenerateResult }> {
    const started = Date.now();
    assertCopilotGuardrails(input.context);

    if (input.task === 'LEAD_SUMMARY') {
      return this.generateLeadSummary(tenantId, input, actorId, started);
    }

    if (!input.unitId?.trim()) {
      throw new UnprocessableEntityException({ detail: 'unitId is required' });
    }
    if (input.task !== 'LISTING_DESCRIPTION' && input.task !== 'LISTING_TITLE') {
      throw new UnprocessableEntityException({ detail: `Unsupported task: ${input.task}` });
    }

    const tone: CopilotTone = input.tone ?? 'premium';
    const language = input.language ?? 'vi';

    const unitRes = await this.gr.getUnit(tenantId, input.unitId.trim());
    const unit = unitRes.data.attributes;
    const project = await this.projects.findOne({
      where: { id: unit.projectId, tenantId },
    });

    const ctx: ListingCopilotContext = {
      unitId: input.unitId.trim(),
      unitCode: unit.code,
      projectId: unit.projectId,
      projectName:
        (input.context?.projectName as string | undefined) ??
        project?.name ??
        'Dự án WEREAL Pilot',
      bedrooms: unit.bedrooms,
      area: unit.area,
      floor: unit.floor,
      status: unit.status,
      basePrice: unit.basePrice,
      priceDisplay:
        typeof input.context?.priceDisplay === 'number'
          ? input.context.priceDisplay
          : unit.basePrice,
    };

    const generated = generateListingCopilotCopy(ctx, tone);
    const latencyMs = Date.now() - started;

    const result: CopilotGenerateResult = {
      id: `ai_${randomUUID().replace(/-/g, '').slice(0, 10)}`,
      attributes: {
        task: input.task,
        title: generated.title,
        content: input.task === 'LISTING_TITLE' ? generated.title : generated.content,
        disclaimer: COPILOT_DISCLAIMER,
        requiresApproval: true,
        modelVersion: COPILOT_MODEL_VERSION,
        tone,
        language,
        latencyMs,
      },
    };

    await this.audit.append({
      tenantId,
      entityType: 'ai_copilot',
      entityId: result.id,
      action: 'AI_COPILOT_GENERATE',
      actorId: actorId ?? null,
      payload: {
        task: input.task,
        unitId: ctx.unitId,
        listingId: input.listingId ?? null,
        tone,
        modelVersion: COPILOT_MODEL_VERSION,
        latencyMs,
        requiresApproval: true,
      },
    });

    return { data: result };
  }

  /** P2 FR-AI-002 — lead summary + next actions (human review outbound) */
  async generateLeadSummary(
    tenantId: string,
    input: CopilotGenerateInput,
    actorId: string | undefined,
    started: number,
  ) {
    const leadId = input.leadId?.trim();
    if (!leadId) {
      throw new UnprocessableEntityException({ detail: 'leadId is required for LEAD_SUMMARY' });
    }

    const lead = await this.leads.findOne({ where: { id: leadId, tenantId } });
    if (!lead) {
      throw new NotFoundException({ detail: `Lead ${leadId} not found` });
    }

    const [viewings, activities] = await Promise.all([
      this.viewings.find({
        where: { tenantId, leadId },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.activities.find({
        where: { tenantId, leadId },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    const brief = generateLeadCopilotBrief(lead, viewings, activities);
    const draftId = `lcd_${randomUUID().replace(/-/g, '').slice(0, 8)}`;

    await this.drafts.save({
      id: draftId,
      tenantId,
      leadId,
      summary: brief.summary,
      nextActions: brief.nextActions,
      status: 'PENDING',
      requiresApproval: true,
      modelVersion: LEAD_COPILOT_MODEL_VERSION,
      createdBy: actorId ?? null,
    });

    const latencyMs = Date.now() - started;
    const result: CopilotGenerateResult = {
      id: draftId,
      attributes: {
        task: 'LEAD_SUMMARY',
        title: `Tóm tắt lead · ${lead.fullName}`,
        content: brief.summary,
        summary: brief.summary,
        nextActions: brief.nextActions,
        disclaimer: LEAD_COPILOT_DISCLAIMER,
        requiresApproval: true,
        outboundReviewRequired: true,
        modelVersion: LEAD_COPILOT_MODEL_VERSION,
        language: input.language ?? 'vi',
        latencyMs,
        draftStatus: 'PENDING',
      },
    };

    await this.audit.append({
      tenantId,
      entityType: 'ai_lead_copilot',
      entityId: draftId,
      action: 'AI_COPILOT_LEAD_SUMMARY',
      actorId: actorId ?? null,
      payload: {
        leadId,
        nextActions: brief.nextActions,
        requiresApproval: true,
      },
    });

    return { data: result };
  }

  async approveLeadDraft(tenantId: string, draftId: string, actorId: string) {
    const draft = await this.drafts.findOne({ where: { id: draftId, tenantId } });
    if (!draft) {
      throw new NotFoundException({ detail: `Draft ${draftId} not found` });
    }
    draft.status = 'APPROVED';
    draft.approvedBy = actorId;
    draft.approvedAt = new Date();
    await this.drafts.save(draft);
    return { data: { id: draft.id, status: 'APPROVED' } };
  }
}
