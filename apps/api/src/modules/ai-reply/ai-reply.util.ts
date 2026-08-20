export type AiReplyTone = 'formal' | 'friendly' | 'concise';

export type AiReplyDraft = {
  draftId: string;
  inboundMessage: string;
  replyText: string;
  tone: AiReplyTone;
  confidence: number;
  suggestedActions: string[];
};

export function composeSalesReply(input: {
  inboundMessage: string;
  leadName?: string;
  unitCode?: string;
  projectName?: string;
  tone?: AiReplyTone;
}): AiReplyDraft {
  const tone = input.tone ?? 'friendly';
  const name = input.leadName?.trim() || 'Anh/Chị';
  const unit = input.unitCode ? ` căn ${input.unitCode}` : '';
  const project = input.projectName ? ` tại ${input.projectName}` : '';

  const opener =
    tone === 'formal'
      ? `Kính gửi ${name},`
      : tone === 'concise'
        ? `Chào ${name},`
        : `Xin chào ${name},`;

  const body = input.inboundMessage.toLowerCase().includes('giá')
    ? `Cảm ơn ${name} đã quan tâm${unit}${project}. Em sẽ gửi bảng giá chi tiết và lịch xem nhà phù hợp trong hôm nay.`
    : `Cảm ơn ${name} đã liên hệ${unit}${project}. Em sẵn sàng tư vấn thêm thông tin và hỗ trợ đặt lịch xem nhà.`;

  const closing =
    tone === 'formal'
      ? 'Trân trọng.'
      : tone === 'concise'
        ? 'Cảm ơn!'
        : 'Rất mong được hỗ trợ Anh/Chị!';

  return {
    draftId: `rpl_${Date.now()}`,
    inboundMessage: input.inboundMessage.trim(),
    replyText: [opener, '', body, '', closing].join('\n'),
    tone,
    confidence: 0.82,
    suggestedActions: ['Gửi bảng giá', 'Đặt lịch xem nhà', 'Chuyển HOT lead'],
  };
}
