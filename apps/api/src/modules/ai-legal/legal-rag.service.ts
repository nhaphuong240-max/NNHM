import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { DocumentEntity } from '../../database/entities/document.entity';
import { AuditService } from '../audit/audit.service';
import {
  composeLegalAnswer,
  LEGAL_SEED_CHUNKS,
  searchLegalCorpus,
  type LegalRagChunk,
} from './legal-rag.util';

@Injectable()
export class LegalRagService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documents: Repository<DocumentEntity>,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  status() {
    return {
      module: 'ai-legal',
      uc: 'UC-AI-03',
      screen: 'SCR-AGENT-001',
      model: 'keyword-rag-v1',
      vectorStore: 'pilot-in-memory',
    };
  }

  async listCorpus(tenantId: string) {
    const corpus = await this.buildCorpus(tenantId);
    return {
      data: corpus.map((c) => ({
        id: c.id,
        documentId: c.documentId,
        title: c.title,
        source: c.source,
        tags: c.tags,
      })),
      meta: { tenantId, count: corpus.length, uc: ['UC-AI-03'], screen: 'SCR-AGENT-001' },
    };
  }

  /** UC-AI-03 — legal RAG query with citations */
  async query(tenantId: string, input: { query: string; limit?: number }, actorId?: string) {
    const q = input.query?.trim();
    if (!q) {
      throw new NotFoundException({ detail: 'query is required' });
    }

    const corpus = await this.buildCorpus(tenantId);
    const hits = searchLegalCorpus(corpus, q, input.limit ?? 5);
    const answer = composeLegalAnswer(q, hits);

    await this.audit.append({
      tenantId,
      entityType: 'legal_rag_query',
      entityId: `lrq_${Date.now()}`,
      action: 'QUERY',
      payload: {
        query: q,
        hitCount: hits.length,
        topDocumentIds: hits.map((h) => h.documentId).filter(Boolean),
      },
      actorId: actorId ?? null,
    });

    return {
      data: {
        query: q,
        answer,
        hits: hits.map((h) => ({
          id: h.id,
          documentId: h.documentId,
          title: h.title,
          source: h.source,
          score: h.score,
          snippet: h.snippet,
        })),
        model: 'keyword-rag-v1',
      },
      meta: { uc: ['UC-AI-03'], screen: 'SCR-AGENT-001', hitCount: hits.length },
    };
  }

  private async buildCorpus(tenantId: string): Promise<LegalRagChunk[]> {
    const chunks: LegalRagChunk[] = [...LEGAL_SEED_CHUNKS];

    const rows = await this.documents.find({
      where: { tenantId },
      order: { updatedAt: 'DESC' },
      take: 30,
    });

    for (const row of rows) {
      if (row.folder !== 'LEGAL' && row.folder !== 'CONTRACT') continue;
      const excerpt = this.readTextExcerpt(tenantId, row);
      chunks.push({
        id: `doc_${row.id}`,
        documentId: row.id,
        title: row.fileName,
        source: `${row.entityType}/${row.entityId} · ${row.docType}`,
        tags: [row.docType.toLowerCase(), row.folder.toLowerCase()],
        text: excerpt || `${row.fileName} — ${row.docType} (${row.mimeType})`,
      });
    }

    return chunks;
  }

  private readTextExcerpt(tenantId: string, row: DocumentEntity): string | null {
    if (row.mimeType !== 'text/plain') return null;
    const root = this.config.get<string>('DOCUMENTS_LOCAL_ROOT', join(process.cwd(), 'uploads'));
    const path = join(root, tenantId, row.storageKey);
    if (!existsSync(path)) return null;
    try {
      return readFileSync(path, 'utf8').slice(0, 4000);
    } catch {
      return null;
    }
  }
}
