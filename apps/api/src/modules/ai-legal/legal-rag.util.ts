export type LegalRagChunk = {
  id: string;
  documentId?: string;
  title: string;
  text: string;
  source: string;
  tags: string[];
};

export type LegalRagHit = LegalRagChunk & {
  score: number;
  snippet: string;
};

const VI_STOP = new Set(['và', 'của', 'cho', 'theo', 'là', 'có', 'được', 'trong', 'một', 'các']);

export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !VI_STOP.has(t));
}

/** Pilot RAG — keyword scoring over legal corpus (vector-store ready interface) */
export function searchLegalCorpus(chunks: LegalRagChunk[], query: string, limit = 5): LegalRagHit[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return [];

  const scored = chunks
    .map((chunk) => {
      const haystack = `${chunk.title} ${chunk.text} ${chunk.tags.join(' ')}`.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (haystack.includes(token)) score += token.length >= 5 ? 3 : 1;
      }
      const idx = chunk.text.toLowerCase().indexOf(tokens[0] ?? '');
      const snippet =
        idx >= 0
          ? chunk.text.slice(Math.max(0, idx - 40), idx + 120).trim()
          : chunk.text.slice(0, 160).trim();

      return { ...chunk, score, snippet };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

export function composeLegalAnswer(query: string, hits: LegalRagHit[]): string {
  if (hits.length === 0) {
    return 'Không tìm thấy đoạn pháp lý phù hợp trong Document Vault pilot. Thử từ khóa: đặt cọc, hợp đồng, PDPA, bàn giao.';
  }

  const lead = hits[0]!;
  const summary = hits
    .slice(0, 3)
    .map((h, i) => `${i + 1}. ${h.title}: ${h.snippet}`)
    .join('\n');

  return [
    `Tra cứu: "${query.trim()}"`,
    '',
    `Tóm tắt (rules-v1 pilot): ${lead.snippet}`,
    '',
    'Trích dẫn:',
    summary,
    '',
    'Lưu ý: Pilot RAG — cần xác minh với pháp chế dự án trước khi tư vấn khách.',
  ].join('\n');
}

export const LEGAL_SEED_CHUNKS: LegalRagChunk[] = [
  {
    id: 'legal_seed_deposit',
    documentId: 'doc_seed_legal01',
    title: 'Quy định đặt cọc giữ chỗ',
    source: 'Sunrise Tower A · Legal pack',
    tags: ['dat coc', 'booking', 'deposit', 'hold'],
    text:
      'Khách hàng đặt cọc giữ chỗ căn hộ phải ký biên bản đặt cọc trong 48 giờ. Số tiền cọc tối thiểu 2% giá niêm yết GR. Hoàn cọc theo điều khoản dự án nếu chủ đầu tư không bàn giao đúng hạn cam kết.',
  },
  {
    id: 'legal_seed_contract',
    title: 'Hợp đồng mua bán căn hộ chung cư',
    source: 'WEREAL template tpl_sale_agreement',
    tags: ['hop dong', 'hdmb', 'ban giao', 'contract'],
    text:
      'Hợp đồng mua bán căn hộ chung cư phải ghi rõ diện tích thông thủy, giá GR, lịch thanh toán và điều kiện bàn giao. E-sign lưu Document Vault tối thiểu 10 năm.',
  },
  {
    id: 'legal_seed_pdpa',
    title: 'PDPA consent lead form',
    source: 'UC-CRM-01 · FR-CRM-01',
    tags: ['pdpa', 'consent', 'privacy', 'lead'],
    text:
      'Lead form bắt buộc tick consent PDPA trước submit. Lưu privacyPolicyVersion và consentAt trên Lead entity. Không gửi marketing nếu marketingConsent=false.',
  },
];
