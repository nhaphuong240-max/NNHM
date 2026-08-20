export type ChatIntent = 'search' | 'price' | 'visit' | 'general';

export type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  at: string;
};

export type ChatRecommendation = {
  unitId: string;
  code: string;
  title: string;
  basePrice: number;
  reason: string;
};

export function detectChatIntent(text: string): ChatIntent {
  const q = text.toLowerCase();
  if (/gi[aá]|price|t[yỷ]|tỷ|triệu/.test(q)) return 'price';
  if (/xem|visit|tham quan|đi xem/.test(q)) return 'visit';
  if (/2pn|3pn|bedroom|phòng ngủ|tìm|search|căn/.test(q)) return 'search';
  return 'general';
}

export function composeChatReply(intent: ChatIntent, userText: string): string {
  switch (intent) {
    case 'price':
      return 'Dưới đây là các căn phù hợp ngân sách bạn mô tả. Bạn muốn em gửi bảng giá chi tiết qua Zalo không?';
    case 'visit':
      return 'Em có thể đặt lịch xem nhà cuối tuần này. Bạn ưu tiên buổi sáng hay chiều?';
    case 'search':
      return 'Em tìm thấy vài căn phù hợp tiêu chí. Xem gợi ý bên dưới hoặc nói thêm ngân sách/khu vực nhé.';
    default:
      return `Cảm ơn bạn! Em là trợ lý WEREAL pilot — hỏi về giá, vị trí, hoặc lịch xem nhà. (Bạn vừa hỏi: "${userText.slice(0, 60)}")`;
  }
}
