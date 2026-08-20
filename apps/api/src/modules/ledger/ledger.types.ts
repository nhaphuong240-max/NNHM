import type { LedgerEntryEntity, LedgerSide } from '../../database/entities/ledger-entry.entity';

export interface LedgerEntryLine {
  id: string;
  account: string;
  side: LedgerSide;
  amount: number;
}

export interface LedgerJournalRecord {
  id: string;
  attributes: {
    journalId: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    currency: string;
    reference: string;
    bookingId: string;
    paymentIntentId: string;
    postedAt: string;
    balanced: boolean;
    lines: LedgerEntryLine[];
  };
}

export interface ListLedgerEntriesQuery {
  tenantId: string;
  bookingId?: string;
  dateFrom?: string;
  limit?: number;
}

export interface ListLedgerEntriesResult {
  data: LedgerJournalRecord[];
  meta: {
    count: number;
    tenantId: string;
    totalDebit: number;
    totalCredit: number;
    balanced: boolean;
  };
}

export function mapJournalToApiRow(
  journal: {
    id: string;
    tenantId: string;
    bookingId: string;
    paymentIntentId: string;
    reference: string;
    postedAt: Date;
  },
  lines: LedgerEntryEntity[],
): LedgerJournalRecord {
  const debit = lines.find((l) => l.side === 'DEBIT');
  const credit = lines.find((l) => l.side === 'CREDIT');
  const debitAmount = debit ? Number(debit.amount) : 0;
  const creditAmount = credit ? Number(credit.amount) : 0;

  return {
    id: debit?.id ?? journal.id,
    attributes: {
      journalId: journal.id,
      debitAccount: debit?.account ?? '',
      creditAccount: credit?.account ?? '',
      amount: debitAmount,
      currency: debit?.currency ?? 'VND',
      reference: journal.reference,
      bookingId: journal.bookingId,
      paymentIntentId: journal.paymentIntentId,
      postedAt: journal.postedAt.toISOString(),
      balanced: debitAmount === creditAmount && debitAmount > 0,
      lines: lines.map((line) => ({
        id: line.id,
        account: line.account,
        side: line.side,
        amount: Number(line.amount),
      })),
    },
  };
}
