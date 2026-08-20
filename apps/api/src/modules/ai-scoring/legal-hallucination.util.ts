import {
  composeLegalAnswer,
  LEGAL_SEED_CHUNKS,
  searchLegalCorpus,
} from '../ai-legal/legal-rag.util';

export type LegalHallucinationEval = {
  cases: number;
  cited: number;
  hallucinationRate: number;
  pass: boolean;
  threshold: number;
  queries: { query: string; hitCount: number; cited: boolean }[];
};

const TC12_LEGAL_QUERIES = [
  'đặt cọc giữ chỗ',
  'hợp đồng mua bán',
  'PDPA consent',
  'bàn giao nhà',
  'phí dịch vụ',
];

/** TC-12 — legal RAG hallucination rate (citation coverage when corpus hits exist). */
export function evaluateLegalHallucination(threshold = 0.05): LegalHallucinationEval {
  const queries: LegalHallucinationEval['queries'] = [];
  let cited = 0;
  let casesWithHits = 0;

  for (const query of TC12_LEGAL_QUERIES) {
    const hits = searchLegalCorpus(LEGAL_SEED_CHUNKS, query, 3);
    const hitCount = hits.length;
    if (hitCount === 0) {
      queries.push({ query, hitCount, cited: true });
      continue;
    }

    casesWithHits += 1;
    const answer = composeLegalAnswer(query, hits);
    const hasCitation = answer.includes('Trích dẫn:') || answer.includes('Tóm tắt');
    if (hasCitation) cited += 1;
    queries.push({ query, hitCount, cited: hasCitation });
  }

  const hallucinationRate =
    casesWithHits > 0
      ? Math.round(((casesWithHits - cited) / casesWithHits) * 1000) / 1000
      : 0;

  return {
    cases: TC12_LEGAL_QUERIES.length,
    cited,
    hallucinationRate,
    pass: hallucinationRate <= threshold,
    threshold,
    queries,
  };
}
