import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntryEntity } from '../../database/entities/ledger-entry.entity';
import { LedgerJournalEntity } from '../../database/entities/ledger-journal.entity';
import type { ListLedgerEntriesQuery, ListLedgerEntriesResult } from './ledger.types';
import { mapJournalToApiRow } from './ledger.types';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerJournalEntity)
    private readonly journals: Repository<LedgerJournalEntity>,
    @InjectRepository(LedgerEntryEntity)
    private readonly entries: Repository<LedgerEntryEntity>,
  ) {}

  status() {
    return {
      module: 'ledger',
      sprint: 'S4',
      ucs: ['UC-PAY-01', 'UC-PAY-02'],
      rule: 'BR-18 double-entry · S4-04 reconcile',
    };
  }

  /** API-065 GET /ledger/entries — immutable journal rows, debit = credit */
  async listEntries(query: ListLedgerEntriesQuery): Promise<ListLedgerEntriesResult> {
    const limit = Math.min(query.limit ?? 50, 200);

    const qb = this.journals
      .createQueryBuilder('j')
      .where('j.tenant_id = :tenantId', { tenantId: query.tenantId })
      .orderBy('j.posted_at', 'DESC')
      .take(limit);

    if (query.bookingId) {
      qb.andWhere('j.booking_id = :bookingId', { bookingId: query.bookingId });
    }

    if (query.dateFrom) {
      qb.andWhere('j.posted_at >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
    }

    const journalRows = await qb.getMany();
    const data = await Promise.all(
      journalRows.map(async (journal) => {
        const lines = await this.entries.find({
          where: { journalId: journal.id },
          order: { side: 'ASC' },
        });
        return mapJournalToApiRow(journal, lines);
      }),
    );

    const totalDebit = data.reduce((sum, row) => sum + row.attributes.amount, 0);
    const totalCredit = data.reduce(
      (sum, row) =>
        sum +
        row.attributes.lines
          .filter((l) => l.side === 'CREDIT')
          .reduce((s, l) => s + l.amount, 0),
      0,
    );

    return {
      data,
      meta: {
        count: data.length,
        tenantId: query.tenantId,
        totalDebit,
        totalCredit,
        balanced: totalDebit === totalCredit,
      },
    };
  }
}
