import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';
import { ViewingEntity } from '../../database/entities/viewing.entity';
import { computeLeadHealth } from './lead-health-score.util';

/** P2 FR-LEAD-007b — persist + explain lead health score. */
@Injectable()
export class LeadHealthScoreService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(ViewingEntity)
    private readonly viewings: Repository<ViewingEntity>,
    @InjectRepository(SearchIndexDocEntity)
    private readonly index: Repository<SearchIndexDocEntity>,
  ) {}

  async computeAndPersist(tenantId: string, leadId: string) {
    const lead = await this.leads.findOne({ where: { id: leadId, tenantId } });
    if (!lead) return null;

    const viewings = await this.viewings.find({
      where: { tenantId, leadId },
      order: { createdAt: 'DESC' },
    });

    let unitPrice: number | null = null;
    if (lead.unitId) {
      const doc = await this.index.findOne({ where: { id: lead.unitId, tenantId } });
      if (doc) unitPrice = Number(doc.basePrice);
    }

    const result = computeLeadHealth(lead, viewings, unitPrice);
    lead.healthScore = result.healthScore;
    lead.healthMeta = {
      factors: result.factors,
      computedAt: new Date().toISOString(),
      modelVersion: 'health-v1-p2-2026',
    };
    await this.leads.save(lead);
    return result;
  }

  async explainHealth(tenantId: string, leadId: string) {
    const lead = await this.leads.findOne({ where: { id: leadId.trim(), tenantId } });
    if (!lead) {
      throw new NotFoundException({ detail: `Lead ${leadId} not found` });
    }

    const result = await this.computeAndPersist(tenantId, leadId);

    return {
      data: {
        leadId: lead.id,
        healthScore: result!.healthScore,
        tier: lead.tier,
        intentScore: lead.score,
        factors: result!.factors,
        disclaimer: result!.disclaimer,
        autoRejectForbidden: true,
        modelVersion: 'health-v1-p2-2026',
      },
      meta: { tenantId, fr: 'FR-LEAD-007b', uc: 'UC-AI-02' },
    };
  }
}
