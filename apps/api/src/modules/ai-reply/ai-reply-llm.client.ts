import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiReplyTone } from './ai-reply.util';

export type LlmDraftResult = {
  replyText: string;
  model: string;
  source: 'llm' | 'template-fallback';
};

@Injectable()
export class AiReplyLlmClient {
  constructor(private readonly config: ConfigService) {}

  isEnabled() {
    return (
      this.config.get<string>('AI_REPLY_ENABLED', 'true') !== 'false' &&
      !!this.config.get<string>('OPENAI_API_KEY')
    );
  }

  async compose(input: {
    inboundMessage: string;
    leadName?: string;
    unitCode?: string;
    tone?: AiReplyTone;
  }): Promise<LlmDraftResult | null> {
    if (!this.isEnabled()) return null;

    const model = this.config.get<string>('AI_REPLY_MODEL', 'gpt-4o-mini');
    const baseUrl = this.config.get<string>(
      'OPENAI_BASE_URL',
      'https://api.openai.com/v1',
    );
    const apiKey = this.config.get<string>('OPENAI_API_KEY', '');

    const system = `You are a Vietnamese real-estate sales assistant. Tone: ${input.tone ?? 'friendly'}. Keep under 120 words.`;
    const user = [
      input.leadName ? `Lead: ${input.leadName}` : null,
      input.unitCode ? `Unit: ${input.unitCode}` : null,
      `Inbound: ${input.inboundMessage}`,
      'Draft a helpful reply in Vietnamese.',
    ]
      .filter(Boolean)
      .join('\n');

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.4,
      }),
    });

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      throw new Error(json.error?.message ?? `LLM request failed: ${res.status}`);
    }

    const replyText = json.choices?.[0]?.message?.content?.trim();
    if (!replyText) return null;

    return { replyText, model, source: 'llm' };
  }
}
