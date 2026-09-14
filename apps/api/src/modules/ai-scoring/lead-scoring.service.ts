import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { LeadScoringOutboxEntity } from '../../database/entities/lead-scoring-outbox.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { AuditService } from '../audit/audit.service';
import { StreamEventsService } from '../stream/stream-events.service';
import {
  fallbackLeadScore,
  inferLeadScore,
  type LeadScoringInput,
  PROVISIONAL_LEAD_SCORE,
  SCORING_MODEL_VERSION,
} from './lead-scoring.engine';
import { buildLeadScoreExplainFactors } from './lead-scoring-explain.util';
import { LeadHealthScoreService } from './lead-health-score.service';
import { LeadRoutingService } from './lead-routing.service';

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(
    @InjectRepository(LeadScoringOutboxEntity)
    private readonly outbox: Repository<LeadScoringOutboxEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    private readonly routing: LeadRoutingService,
    private readonly health: LeadHealthScoreService,
    private readonly audit: AuditService,
    private readonly streamEvents: StreamEventsService,
  ) {}

  buildSnapshot(input: LeadScoringInput): Record<string, unknown> {
    return {
      source: input.source,
      unitId: input.unitId,
      email: input.email,
      message: input.message,
      utm: input.utm,
    };
  }

  async enqueue(tenantId: string, leadId: string, input: LeadScoringInput) {
    const row = await this.outbox.save({
      id: `lsc_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      leadId,
      payload: this.buildSnapshot(input),
      status: 'PENDING',
      attempts: 0,
      lastError: null,
      processedAt: null,
    });

    await this.processOne(row.id);
    return row;
  }

  async processPending(limit = 50) {
    const pending = await this.outbox.find({
      where: { status: 'PENDING' },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    for (const row of pending) {
      await this.processOne(row.id);
    }

    return pending.length;
  }

  async processOne(outboxId: string) {
    const row = await this.outbox.findOne({ where: { id: outboxId } });
    if (!row || row.status !== 'PENDING') return;

    const started = Date.now();
    try {
      const lead = await this.leads.findOne({
        where: { id: row.leadId, tenantId: row.tenantId },
      });
      if (!lead) {
        throw new Error(`Lead ${row.leadId} not found`);
      }

      const input = row.payload as LeadScoringInput;
      let result;
      try {
        result = inferLeadScore(input);
      } catch (err) {
        result = fallbackLeadScore(err instanceof Error ? err.message : 'infer failed');
      }

      lead.score = result.score;
      lead.tier = result.tier;
      lead.scoreStatus = result.unscored ? 'UNSCORED' : 'SCORED';
      lead.scoringMeta = {
        modelVersion: result.modelVersion,
        features: result.features,
        unscored: result.unscored,
        lagMs: Date.now() - row.createdAt.getTime(),
      };
      lead.updatedAt = new Date();

      await this.routing.applyRouting(row.tenantId, lead);
      await this.leads.save(lead);
      await this.health.computeAndPersist(row.tenantId, lead.id);

      await this.audit.append({
        tenantId: row.tenantId,
        entityType: 'lead',
        entityId: lead.id,
        action: 'AI_SCORE',
        payload: {
          score: lead.score,
          tier: lead.tier,
          scoreStatus: lead.scoreStatus,
          assignedTo: lead.assignedTo,
          routingStatus: lead.routingStatus,
          modelVersion: SCORING_MODEL_VERSION,
          features: result.features,
          unscored: result.unscored,
        },
        actorId: null,
      });

      await this.streamEvents.publish(row.tenantId, {
        event: 'lead.scored',
        data: {
          leadId: lead.id,
          score: lead.score,
          tier: lead.tier,
          assignedTo: lead.assignedTo,
          routingStatus: lead.routingStatus,
          timestamp: new Date().toISOString(),
        },
      });

      row.status = 'PROCESSED';
      row.processedAt = new Date();
      row.lastError = null;
      await this.outbox.save(row);

      const lagMs = Date.now() - started;
      this.logger.debug(
        `UC-AI-02 scored ${lead.id} → ${lead.tier}/${lead.score} lag=${lagMs}ms`,
      );
    } catch (err) {
      row.attempts += 1;
      row.lastError = err instanceof Error ? err.message : String(err);
      row.status = row.attempts >= 5 ? 'FAILED' : 'PENDING';
      await this.outbox.save(row);

      const lead = await this.leads.findOne({
        where: { id: row.leadId, tenantId: row.tenantId },
      });
      if (lead && lead.scoreStatus === 'PENDING') {
        const fallback = fallbackLeadScore(row.lastError);
        lead.score = fallback.score;
        lead.tier = fallback.tier;
        lead.scoreStatus = 'UNSCORED';
        lead.scoringMeta = {
          modelVersion: fallback.modelVersion,
          features: fallback.features,
          unscored: true,
        };
        await this.leads.save(lead);
      }

      this.logger.warn(`Lead scoring outbox ${row.id} failed: ${row.lastError}`);
    }
  }

  async getStatus(tenantId: string) {
    const [pendingCount, failedCount, latestProcessed] = await Promise.all([
      this.outbox.count({ where: { tenantId, status: 'PENDING' } }),
      this.outbox.count({ where: { tenantId, status: 'FAILED' } }),
      this.outbox.findOne({
        where: { tenantId, status: 'PROCESSED' },
        order: { processedAt: 'DESC' },
      }),
    ]);

    const oldestPending = await this.outbox.findOne({
      where: { tenantId, status: 'PENDING' },
      order: { createdAt: 'ASC' },
    });

    const lagMs = oldestPending
      ? Date.now() - oldestPending.createdAt.getTime()
      : latestProcessed?.processedAt
        ? Date.now() - latestProcessed.processedAt.getTime()
        : 0;

    return {
      tenantId,
      modelVersion: SCORING_MODEL_VERSION,
      provisionalScore: PROVISIONAL_LEAD_SCORE,
      outbox: { pending: pendingCount, failed: failedCount },
      lagMs,
      targetLagMs: 2000,
      healthy: pendingCount === 0 && lagMs <= 2000,
      lastProcessedAt: latestProcessed?.processedAt?.toISOString() ?? null,
    };
  }

  /** UC-AI-02 — explain stored score for agent lead detail */
  async explainLeadScore(tenantId: string, leadId: string) {
    const lead = await this.leads.findOne({ where: { id: leadId.trim(), tenantId } });
    if (!lead) {
      throw new NotFoundException({ detail: `Lead ${leadId} not found` });
    }

    const meta = (lead.scoringMeta ?? {}) as Record<string, unknown>;
    const features = (meta.features as Record<string, unknown> | undefined) ?? {};
    const factors = buildLeadScoreExplainFactors(features);

    return {
      data: {
        leadId: lead.id,
        score: lead.score,
        tier: lead.tier,
        scoreStatus: lead.scoreStatus,
        modelVersion: String(meta.modelVersion ?? SCORING_MODEL_VERSION),
        unscored: Boolean(meta.unscored),
        lagMs: typeof meta.lagMs === 'number' ? meta.lagMs : null,
        features,
        factors,
        totalImpact: factors.reduce((sum, f) => sum + f.impact, 0),
      },
      meta: { uc: ['UC-AI-02'], screen: 'SCR-AGENT-014', tenantId },
    };
  }
}
