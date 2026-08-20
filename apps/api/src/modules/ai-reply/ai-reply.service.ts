import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { AuditService } from '../audit/audit.service';
import { CrmInboxService } from '../crm/crm-inbox.service';
import { AiReplyLlmClient } from './ai-reply-llm.client';
import { composeSalesReply, type AiReplyTone } from './ai-reply.util';

@Injectable()
export class AiReplyService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    private readonly audit: AuditService,
    private readonly llm: AiReplyLlmClient,
    private readonly inbox: CrmInboxService,
  ) {}

  status() {
    return {
      module: 'ai-reply',
      uc: 'UC-AI-04',
      screen: 'SCR-AGENT-002',
      model: this.llm.isEnabled() ? 'openai-compatible' : 'sales-reply-v1-template',
      requiresApproval: true,
      llmEnabled: this.llm.isEnabled(),
    };
  }

  async draft(
    tenantId: string,
    input: { leadId?: string; inboundMessage: string; tone?: AiReplyTone },
    actorId?: string,
  ) {
    const message = input.inboundMessage?.trim();
    if (!message) {
      throw new NotFoundException({ detail: 'inboundMessage is required' });
    }

    let leadName: string | undefined;
    let unitCode: string | undefined;
    if (input.leadId?.trim()) {
      const lead = await this.leads.findOne({
        where: { id: input.leadId.trim(), tenantId },
      });
      if (lead) {
        leadName = lead.fullName;
        unitCode = lead.unitId ?? undefined;
      }
    }

    let draft = composeSalesReply({
      inboundMessage: message,
      leadName,
      unitCode,
      tone: input.tone,
    });
    let source: 'llm' | 'template' = 'template';

    try {
      const llmDraft = await this.llm.compose({
        inboundMessage: message,
        leadName,
        unitCode,
        tone: input.tone,
      });
      if (llmDraft) {
        draft = {
          ...draft,
          replyText: llmDraft.replyText,
          confidence: 0.91,
        };
        source = llmDraft.source === 'llm' ? 'llm' : 'template';
      }
    } catch {
      // fallback to template draft already set
    }

    await this.audit.append({
      tenantId,
      entityType: 'ai_reply_draft',
      entityId: draft.draftId,
      action: 'DRAFT',
      payload: { leadId: input.leadId, inboundPreview: message.slice(0, 120), source },
      actorId: actorId ?? null,
    });

    return {
      data: { ...draft, source },
      meta: { uc: ['UC-AI-04'], screen: 'SCR-AGENT-002', requiresApproval: true, source },
    };
  }

  async send(
    tenantId: string,
    input: { draftId: string; replyText: string; channel?: string; leadId?: string },
    actorId?: string,
  ) {
    const channel = (input.channel ?? 'ZALO') as 'ZALO' | 'SMS' | 'WEB' | 'META' | 'CALL';
    const leadId = input.leadId?.trim();
    let deliveryId: string | undefined;

    if (leadId) {
      const sent = await this.inbox.reply(
        tenantId,
        `inb_${leadId}`,
        { message: input.replyText, channel },
        actorId,
      );
      deliveryId = sent.data.deliveryId;
    }

    await this.audit.append({
      tenantId,
      entityType: 'ai_reply_send',
      entityId: input.draftId.trim(),
      action: 'SEND',
      payload: {
        channel,
        replyPreview: input.replyText.slice(0, 200),
        deliveryId,
      },
      actorId: actorId ?? null,
    });

    return {
      data: {
        draftId: input.draftId,
        status: deliveryId ? 'SENT' : 'LOGGED',
        channel,
        deliveryId,
        sentAt: new Date().toISOString(),
      },
      meta: {
        uc: ['UC-AI-04'],
        screen: 'SCR-AGENT-002',
        mode: deliveryId ? 'production-inbox' : 'audit-only',
      },
    };
  }
}
