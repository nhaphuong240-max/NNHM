import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LedgerEntryEntity } from '../../database/entities/ledger-entry.entity';
import { LedgerJournalEntity } from '../../database/entities/ledger-journal.entity';
import { LedgerService } from './ledger.service';

describe('LedgerService', () => {
  let service: LedgerService;

  const journal: LedgerJournalEntity = {
    id: 'jrn_01',
    tenantId: 'ten_dev_01',
    webhookEventId: 'evt_01',
    bookingId: 'bk_01',
    paymentIntentId: 'pi_01',
    reference: 'MOCK_TXN',
    postedAt: new Date('2026-07-28T10:00:00.000Z'),
  };

  const lines: LedgerEntryEntity[] = [
    {
      id: 'le_debit',
      journalId: 'jrn_01',
      tenantId: 'ten_dev_01',
      account: 'CASH_MOCK',
      side: 'DEBIT',
      amount: '50000000',
      currency: 'VND',
      referenceType: 'payment',
      referenceId: 'pi_01',
      postedAt: new Date('2026-07-28T10:00:00.000Z'),
    },
    {
      id: 'le_credit',
      journalId: 'jrn_01',
      tenantId: 'ten_dev_01',
      account: 'DEPOSIT_LIABILITY',
      side: 'CREDIT',
      amount: '50000000',
      currency: 'VND',
      referenceType: 'payment',
      referenceId: 'pi_01',
      postedAt: new Date('2026-07-28T10:00:00.000Z'),
    },
  ];

  beforeEach(async () => {
    const getMany = jest.fn().mockResolvedValue([journal]);
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        {
          provide: getRepositoryToken(LedgerJournalEntity),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        },
        {
          provide: getRepositoryToken(LedgerEntryEntity),
          useValue: {
            find: jest.fn(async ({ where }: { where: { journalId: string } }) =>
              lines.filter((l) => l.journalId === where.journalId),
            ),
          },
        },
      ],
    }).compile();

    service = module.get(LedgerService);
  });

  it('lists journals with balanced debit/credit lines', async () => {
    const result = await service.listEntries({ tenantId: 'ten_dev_01' });

    expect(result.data[0].attributes.debitAccount).toBe('CASH_MOCK');
    expect(result.data[0].attributes.creditAccount).toBe('DEPOSIT_LIABILITY');
    expect(result.data[0].attributes.balanced).toBe(true);
    expect(result.data[0].attributes.lines).toHaveLength(2);
    expect(result.meta.balanced).toBe(true);
    expect(result.meta.totalDebit).toBe(result.meta.totalCredit);
  });
});
