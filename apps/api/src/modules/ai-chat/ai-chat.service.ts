import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { CrmService } from '../crm/crm.service';
import {
  composeChatReply,
  detectChatIntent,
  type ChatMessage,
  type ChatRecommendation,
} from './ai-chat.util';

@Injectable()
export class AiChatService {
  private readonly sessions = new Map<string, ChatMessage[]>();

  constructor(
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    private readonly audit: AuditService,
    private readonly crm: CrmService,
  ) {}

  status() {
    return {
      module: 'ai-chat',
      uc: 'UC-AI-07',
      screen: 'SCR-PUBLIC-001',
      model: 'discovery-chat-v1',
    };
  }

  startSession(tenantId: string) {
    const sessionId = `chat_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
    this.sessions.set(sessionId, [
      {
        role: 'assistant',
        text: 'Xin chào! Em có thể giúp bạn tìm căn hộ, so sánh giá hoặc đặt lịch xem nhà tại Sunrise Tower.',
        at: new Date().toISOString(),
      },
    ]);
    return {
      data: { sessionId, messages: this.sessions.get(sessionId)! },
      meta: { tenantId, uc: ['UC-AI-07'], screen: 'SCR-PUBLIC-001' },
    };
  }

  async message(
    tenantId: string,
    input: {
      sessionId: string;
      text: string;
      captureLead?: { fullName?: string; phone?: string };
    },
  ) {
    const sessionId = input.sessionId.trim();
    const history = this.sessions.get(sessionId) ?? [];
    const intent = detectChatIntent(input.text);
    const reply = composeChatReply(intent, input.text);
    const now = new Date().toISOString();

    history.push({ role: 'user', text: input.text.trim(), at: now });
    history.push({ role: 'assistant', text: reply, at: now });
    this.sessions.set(sessionId, history);

    const unitRows = await this.units.find({
      where: { tenantId, status: 'AVAILABLE' },
      take: 3,
      order: { basePrice: 'ASC' },
    });
    const recommendations: ChatRecommendation[] = unitRows.map((u) => ({
      unitId: u.id,
      code: u.code,
      title: `${u.code} · ${u.bedrooms}PN · ${u.area}m²`,
      basePrice: Number(u.basePrice),
      reason: intent === 'price' ? 'Phù hợp ngân sách' : 'Gợi ý theo tiêu chí chat',
    }));

    let leadId: string | undefined;
    if (input.captureLead?.phone?.trim()) {
      const lead = await this.crm.createLead(tenantId, {
        fullName: input.captureLead.fullName?.trim() || 'Chat visitor',
        phone: input.captureLead.phone.trim(),
        source: 'PUBLIC_CHAT',
        message: `UC-AI-07 session ${sessionId}`,
      });
      leadId = lead.data.id;
    }

    await this.audit.append({
      tenantId,
      entityType: 'ai_chat_message',
      entityId: sessionId,
      action: 'MESSAGE',
      payload: { intent, leadId, userPreview: input.text.slice(0, 80) },
      actorId: null,
    });

    return {
      data: {
        sessionId,
        messages: history,
        intent,
        recommendations,
        leadId,
      },
      meta: { uc: ['UC-AI-07'], screen: 'SCR-PUBLIC-001', recommendationCount: recommendations.length },
    };
  }
}
