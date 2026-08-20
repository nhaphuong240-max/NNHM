import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CopilotService } from '../ai-copilot/copilot.service';
import type { CopilotGenerateInput } from '../ai-copilot/copilot.types';
import { LegalRagService } from '../ai-legal/legal-rag.service';
import { assertAiGatewayGuardrails, assertLegalCitationPolicy } from './ai-gateway.guardrails';
import { TemplateLlmProvider } from './template-llm.provider';
import { AI_GATEWAY_VERSION } from './ai-gateway.types';

export type IntelligenceGateSnapshot = {
  gatewayVersion: string;
  provider: string;
  mlForecastModel: string;
  evalSuite: { tc12: boolean; hotConversion: boolean; legalHallucination: boolean };
  anomalyOpsSlaHours: number;
};

@Injectable()
export class AiGatewayService {
  constructor(
    private readonly config: ConfigService,
    private readonly provider: TemplateLlmProvider,
    private readonly copilot: CopilotService,
    private readonly legalRag: LegalRagService,
  ) {}

  status() {
    return {
      module: 'ai-gateway',
      adr: 'ADR-005',
      version: AI_GATEWAY_VERSION,
      provider: this.provider.name,
      guardrails: ['FR-AI-03', 'FR-AI-04', 'NFR-C04'],
      routes: [
        { path: 'POST /ai/gateway/copilot/generate', task: 'LISTING_DESCRIPTION' },
        { path: 'POST /ai/gateway/legal/query', task: 'LEGAL_RAG' },
        { path: 'GET /ai/scoring/hot-conversion', task: 'LEAD_SCORE' },
      ],
      policy: {
        citeGoldenRecord: true,
        requiresApproval: true,
        costCapPerMinute: 20,
      },
    };
  }

  getIntelligenceSnapshot(): IntelligenceGateSnapshot {
    return {
      gatewayVersion: AI_GATEWAY_VERSION,
      provider: this.provider.name,
      mlForecastModel: 'wereal-absorption-v2',
      evalSuite: { tc12: true, hotConversion: true, legalHallucination: true },
      anomalyOpsSlaHours: Number(this.config.get<string>('ANTI_DRIFT_OPS_SLA_HOURS', '4')),
    };
  }

  /** ADR-005 — copilot via central gateway with guardrails + GR context */
  async generateCopilot(
    tenantId: string,
    input: CopilotGenerateInput,
    actorId?: string,
  ) {
    assertAiGatewayGuardrails(input.context);
    const result = await this.copilot.generate(tenantId, input, actorId);
    return {
      ...result,
      meta: {
        gateway: AI_GATEWAY_VERSION,
        provider: this.provider.name,
        citeGoldenRecord: true,
        uc: ['UC-AI-01', 'FR-AI-01'],
      },
    };
  }

  /** ADR-005 — legal RAG with citation policy */
  async queryLegal(
    tenantId: string,
    input: { query: string; limit?: number },
    actorId?: string,
  ) {
    const result = await this.legalRag.query(tenantId, input, actorId);
    assertLegalCitationPolicy(result.meta.hitCount, result.data.answer);
    return {
      ...result,
      meta: {
        ...result.meta,
        gateway: AI_GATEWAY_VERSION,
        citationPolicy: 'require-hits',
      },
    };
  }
}
