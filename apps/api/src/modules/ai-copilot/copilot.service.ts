import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../../database/entities/project.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
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
import { COPILOT_MODEL_VERSION, generateListingCopilotCopy } from './listing-copilot.engine';

@Injectable()
export class CopilotService {
  constructor(
    private readonly gr: GoldenRecordService,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    private readonly audit: AuditService,
  ) {}

  status() {
    return {
      module: 'ai-copilot',
      uc: 'UC-AI-01',
      fr: ['FR-AI-01', 'FR-AI-03', 'FR-AI-04'],
      rules: ['BR-06', 'BR-16'],
      modelVersion: COPILOT_MODEL_VERSION,
    };
  }

  async generate(
    tenantId: string,
    input: CopilotGenerateInput,
    actorId?: string,
  ): Promise<{ data: CopilotGenerateResult }> {
    const started = Date.now();
    assertCopilotGuardrails(input.context);

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
}
