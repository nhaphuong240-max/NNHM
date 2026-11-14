import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PriceBookVersionEntity } from '../../database/entities/price-book-versions.entity';
import { QuoteEntity } from '../../database/entities/quotes.entity';
import { PriceBookService } from './price-book.service';

function memoryBooks(rows: PriceBookVersionEntity[]) {
  return {
    find: jest.fn(async ({ where }: { where: { tenantId: string; projectId: string } }) =>
      rows.filter((row) => row.tenantId === where.tenantId && row.projectId === where.projectId),
    ),
    create: jest.fn((row: PriceBookVersionEntity) => row),
    save: jest.fn(async (row: PriceBookVersionEntity) => row),
  };
}

function memoryQuotes(rows: QuoteEntity[]) {
  return {
    findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
      rows.find((row) => row.id === where.id && row.tenantId === where.tenantId) ?? null,
    ),
    save: jest.fn(async (row: QuoteEntity) => row),
  };
}

describe('price book windows', () => {
  const from = new Date('2026-01-01T00:00:00.000Z');
  const to = new Date('2026-06-01T00:00:00.000Z');

  it('rejects a sales role and an overlapping window in the same tenant', async () => {
    const books = memoryBooks([
      {
        id: 'pbv_existing',
        tenantId: 'ten_a',
        projectId: 'prj_a',
        versionNo: 1,
        effectiveFrom: from,
        effectiveTo: to,
        status: 'DRAFT',
        payload: {},
        createdAt: from,
      },
    ]);
    const service = new PriceBookService(books as never, memoryQuotes([]) as never);
    await expect(
      service.openVersion({
        tenantId: 'ten_a',
        actorRole: 'AGENT',
        projectId: 'prj_a',
        versionNo: 2,
        effectiveFrom: new Date('2026-03-01T00:00:00.000Z'),
        effectiveTo: new Date('2026-07-01T00:00:00.000Z'),
        payload: {},
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.openVersion({
        tenantId: 'ten_a',
        actorRole: 'DEVELOPER_ADMIN',
        projectId: 'prj_a',
        versionNo: 2,
        effectiveFrom: new Date('2026-03-01T00:00:00.000Z'),
        effectiveTo: new Date('2026-07-01T00:00:00.000Z'),
        payload: {},
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(books.save).not.toHaveBeenCalled();
  });

  it('stores a non-overlapping window only for the caller tenant', async () => {
    const books = memoryBooks([
      {
        id: 'pbv_other',
        tenantId: 'ten_b',
        projectId: 'prj_a',
        versionNo: 1,
        effectiveFrom: from,
        effectiveTo: to,
        status: 'DRAFT',
        payload: {},
        createdAt: from,
      },
    ]);
    const service = new PriceBookService(books as never, memoryQuotes([]) as never);
    const saved = await service.openVersion({
      tenantId: 'ten_a',
      actorRole: 'DEVELOPER_ADMIN',
      projectId: 'prj_a',
      versionNo: 1,
      effectiveFrom: from,
      effectiveTo: to,
      payload: { label: 'window' },
    });
    expect(saved.tenantId).toBe('ten_a');
    expect(saved.status).toBe('DRAFT');
    expect(books.find).toHaveBeenCalledWith({ where: { tenantId: 'ten_a', projectId: 'prj_a' } });
  });

  it('keeps an accepted quote immutable and hides another tenant quote', async () => {
    const quotes = memoryQuotes([
      {
        id: 'qte_a',
        tenantId: 'ten_a',
        priceBookId: 'pbv_a',
        unitId: 'un_a',
        quoteHash: 'hash',
        expiresAt: to,
        status: 'ACCEPTED',
        payload: {},
        createdAt: from,
      },
    ]);
    const service = new PriceBookService(memoryBooks([]) as never, quotes as never);
    await expect(
      service.changeQuoteStatus({
        tenantId: 'ten_a',
        actorRole: 'DEVELOPER_ADMIN',
        quoteId: 'qte_a',
        nextStatus: 'EXPIRED',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.changeQuoteStatus({
        tenantId: 'ten_b',
        actorRole: 'DEVELOPER_ADMIN',
        quoteId: 'qte_a',
        nextStatus: 'EXPIRED',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('accepts a draft to sent transition and rejects an unknown quote status', async () => {
    const quotes = memoryQuotes([
      {
        id: 'qte_a',
        tenantId: 'ten_a',
        priceBookId: 'pbv_a',
        unitId: 'un_a',
        quoteHash: 'hash',
        expiresAt: to,
        status: 'DRAFT',
        payload: {},
        createdAt: from,
      },
    ]);
    const service = new PriceBookService(memoryBooks([]) as never, quotes as never);
    const sent = await service.changeQuoteStatus({
      tenantId: 'ten_a',
      actorRole: 'DEVELOPER_ADMIN',
      quoteId: 'qte_a',
      nextStatus: 'SENT',
    });
    expect(sent.status).toBe('SENT');
    await expect(
      service.changeQuoteStatus({
        tenantId: 'ten_a',
        actorRole: 'DEVELOPER_ADMIN',
        quoteId: 'qte_a',
        nextStatus: 'BOGUS',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
