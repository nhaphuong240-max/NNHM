import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { LedgerEntryEntity } from '../../database/entities/ledger-entry.entity';
import { LedgerJournalEntity } from '../../database/entities/ledger-journal.entity';
import { LedgerWriteService } from './ledger-write.service';

describe('LedgerWriteService', () => {
  let service: LedgerWriteService;
  let journals: LedgerJournalEntity[];
  let entries: LedgerEntryEntity[];

  beforeEach(async () => {
    journals = [];
    entries = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerWriteService,
        {
          provide: getRepositoryToken(LedgerJournalEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: { webhookEventId?: string; id?: string } }) => {
              if (where.webhookEventId) {
                return journals.find((j) => j.webhookEventId === where.webhookEventId) ?? null;
              }
              if (where.id) {
                return journals.find((j) => j.id === where.id) ?? null;
              }
              return null;
            }),
            findOneOrFail: jest.fn(async ({ where }: { where: { id: string } }) => {
              const row = journals.find((j) => j.id === where.id);
              if (!row) throw new Error('not found');
              return row;
            }),
          },
        },
        {
          provide: getRepositoryToken(LedgerEntryEntity),
          useValue: {
            find: jest.fn(async ({ where }: { where: { journalId: string } }) =>
              entries.filter((e) => e.journalId === where.journalId),
            ),
          },
        },
        {
          provide: getDataSourceToken(),
          useValue: {
            transaction: jest.fn(async (fn: (manager: { save: jest.Mock }) => Promise<void>) => {
              const manager = {
                save: jest.fn(async (_entity: unknown, row: unknown) => {
                  if (Array.isArray(row)) {
                    entries.push(...(row as LedgerEntryEntity[]));
                    return row;
                  }
                  journals.push(row as LedgerJournalEntity);
                  return row;
                }),
              };
              await fn(manager);
            }),
          },
        },
      ],
    }).compile();

    service = module.get(LedgerWriteService);
  });

  it('writes balanced double-entry journal on payment success (BR-18)', async () => {
    const result = await service.writePaymentSuccess({
      tenantId: 'ten_dev_01',
      bookingId: 'bk_01',
      paymentIntentId: 'pi_01',
      amount: 50_000_000,
      transactionId: 'MOCK_TXN',
      webhookEventId: 'evt_ledger_01',
      method: 'MOCK',
    });

    expect(result.balanced).toBe(true);
    expect(result.debitAccount).toBe('CASH_MOCK');
    expect(result.creditAccount).toBe('DEPOSIT_LIABILITY');
    expect(result.amount).toBe(50_000_000);
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.side === 'DEBIT')?.amount).toBe('50000000');
    expect(entries.find((e) => e.side === 'CREDIT')?.amount).toBe('50000000');
    expect(await service.isJournalBalanced(result.journalId)).toBe(true);
  });

  it('returns same journal for duplicate webhookEventId', async () => {
    const input = {
      tenantId: 'ten_dev_01',
      bookingId: 'bk_01',
      paymentIntentId: 'pi_01',
      amount: 50_000_000,
      transactionId: 'MOCK_TXN',
      webhookEventId: 'evt_ledger_dup',
      method: 'MOCK' as const,
    };

    const first = await service.writePaymentSuccess(input);
    const second = await service.writePaymentSuccess(input);

    expect(second.journalId).toBe(first.journalId);
    expect(second.entryId).toBe(first.entryId);
    expect(journals).toHaveLength(1);
    expect(entries).toHaveLength(2);
  });

  it('writes balanced reversal journal on refund (ADR-004)', async () => {
    const result = await service.writePaymentRefund({
      tenantId: 'ten_dev_01',
      bookingId: 'bk_01',
      paymentIntentId: 'pi_01',
      refundId: 'rf_01',
      amount: 50_000_000,
      transactionId: 'MOCK_REFUND',
      method: 'MOCK',
    });

    expect(result.balanced).toBe(true);
    expect(result.debitAccount).toBe('DEPOSIT_LIABILITY');
    expect(result.creditAccount).toBe('CASH_MOCK');
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.side === 'DEBIT')?.account).toBe('DEPOSIT_LIABILITY');
    expect(entries.find((e) => e.side === 'CREDIT')?.account).toBe('CASH_MOCK');
  });
});
