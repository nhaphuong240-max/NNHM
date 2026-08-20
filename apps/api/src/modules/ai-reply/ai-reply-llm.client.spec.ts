import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiReplyLlmClient } from './ai-reply-llm.client';

describe('AiReplyLlmClient', () => {
  it('returns null when disabled', async () => {
    const module = await Test.createTestingModule({
      providers: [
        AiReplyLlmClient,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: string) => {
              if (key === 'AI_REPLY_ENABLED') return 'true';
              if (key === 'OPENAI_API_KEY') return '';
              return def;
            },
          },
        },
      ],
    }).compile();

    const client = module.get(AiReplyLlmClient);
    expect(client.isEnabled()).toBe(false);
    expect(await client.compose({ inboundMessage: 'hello' })).toBeNull();
  });
});
