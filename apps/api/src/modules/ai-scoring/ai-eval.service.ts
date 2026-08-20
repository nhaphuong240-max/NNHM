import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SCORING_MODEL_VERSION } from './lead-scoring.engine';
import { evaluateLegalHallucination } from './legal-hallucination.util';

export type AiEvalRow = {
  leadId: string;
  manualTier: string;
  predictedTier: string;
  match: boolean;
};

export type AiEvalSummary = {
  precision: number;
  recall: number;
  f1: number;
  rows: AiEvalRow[];
  modelVersion: string;
};

function parseCsv(body: string): { leadId?: string; manualTier?: string }[] {
  const lines = body.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(',').map((h) => h.trim().toLowerCase());
  const leadIdx = headers.indexOf('leadid');
  const tierIdx = headers.indexOf('manualtier');
  if (leadIdx < 0 || tierIdx < 0) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    return { leadId: cols[leadIdx], manualTier: cols[tierIdx] };
  });
}

/** T4-S6 — rules precision/recall vs manual labels (CSV import stub) */
@Injectable()
export class AiEvalService {
  private readonly logger = new Logger(AiEvalService.name);

  constructor(
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
  ) {}

  status() {
    const legalEval = evaluateLegalHallucination();
    return {
      module: 'ai-eval',
      ucs: ['UC-AI-02', 'TC-12'],
      format: 'csv: leadId,manualTier',
      suites: {
        hotConversion: true,
        legalHallucination: legalEval.pass,
      },
      legalHallucination: {
        pass: legalEval.pass,
        rate: legalEval.hallucinationRate,
        threshold: legalEval.threshold,
      },
    };
  }

  legalHallucinationEval() {
    return evaluateLegalHallucination();
  }

  async evaluateFromCsv(tenantId: string, csvBody: string): Promise<AiEvalSummary> {
    const records = parseCsv(csvBody);
    const rows: AiEvalRow[] = [];
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    for (const record of records) {
      const leadId = record.leadId?.trim();
      const manualTier = record.manualTier?.trim()?.toUpperCase();
      if (!leadId || !manualTier) continue;

      const lead = await this.leads.findOne({ where: { id: leadId, tenantId } });
      const predictedTier = lead?.tier ?? 'NEW';
      const match = predictedTier === manualTier;
      rows.push({ leadId, manualTier, predictedTier, match });

      const manualHot = manualTier === 'HOT';
      const predictedHot = predictedTier === 'HOT';
      if (predictedHot && manualHot) truePositives += 1;
      else if (predictedHot && !manualHot) falsePositives += 1;
      else if (!predictedHot && manualHot) falseNegatives += 1;
    }

    const precision =
      truePositives + falsePositives > 0
        ? truePositives / (truePositives + falsePositives)
        : 1;
    const recall =
      truePositives + falseNegatives > 0
        ? truePositives / (truePositives + falseNegatives)
        : 1;
    const f1 =
      precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    this.logger.log(
      `AI eval tenant=${tenantId} rows=${rows.length} precision=${precision.toFixed(3)} recall=${recall.toFixed(3)}`,
    );

    return {
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      f1: Math.round(f1 * 1000) / 1000,
      rows,
      modelVersion: SCORING_MODEL_VERSION,
    };
  }
}
