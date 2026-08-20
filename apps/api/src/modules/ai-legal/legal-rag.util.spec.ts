import { searchLegalCorpus, LEGAL_SEED_CHUNKS } from './legal-rag.util';

describe('legal-rag.util', () => {
  it('finds deposit-related chunks', () => {
    const hits = searchLegalCorpus(LEGAL_SEED_CHUNKS, 'đặt cọc giữ chỗ');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.id).toBe('legal_seed_deposit');
  });

  it('returns empty for unrelated query', () => {
    const hits = searchLegalCorpus(LEGAL_SEED_CHUNKS, 'xyz unrelated');
    expect(hits.length).toBe(0);
  });
});
