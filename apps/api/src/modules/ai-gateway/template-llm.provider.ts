import { Injectable } from '@nestjs/common';
import type { CompletionParams, CompletionResult, LLMProvider } from './ai-gateway.types';
import { AI_GATEWAY_DISCLAIMER } from './ai-gateway.types';

/** Phase 1 template provider — no external LLM API (swap for OpenAI/Anthropic P2). */
@Injectable()
export class TemplateLlmProvider implements LLMProvider {
  readonly name = 'template-vi-v1';

  async complete(params: CompletionParams): Promise<CompletionResult> {
    const started = Date.now();
    const tone = params.tone ?? 'premium';
    const content =
      params.task === 'LEGAL_RAG'
        ? `[Gateway template] Tra cứu pháp lý: ${params.prompt.slice(0, 120)}`
        : `[Gateway template · ${tone}] ${params.prompt.slice(0, 200)}`;

    return {
      content,
      model: this.name,
      provider: 'template',
      latencyMs: Date.now() - started,
      requiresApproval: true,
      disclaimer: AI_GATEWAY_DISCLAIMER,
    };
  }
}
