import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LedgerEntryEntity } from '../../database/entities/ledger-entry.entity';
import { LedgerJournalEntity } from '../../database/entities/ledger-journal.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { ReconciliationReportEntity } from '../../database/entities/reconciliation-report.entity';
import { PaymentWebhookEventEntity } from '../../database/entities/payment-webhook-event.entity';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationAlertService } from './reconciliation-alert.service';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let alertMock: { notifyMismatch: jest.Mock };
  let reports: ReconciliationReportEntity[];
  let webhooks: PaymentWebhookEventEntity[];
  let journals: LedgerJournalEntity[];
  let entries: LedgerEntryEntity[];

  beforeEach(async () => {
    reports = [];
    webhooks = [];
    journals = [];
    entries = [];
    alertMock = { notifyMismatch: jest.fn(async () => undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        {
          provide: getRepositoryToken(ReconciliationReportEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: { tenantId: string; reportDate?: string } }) =>
              reports.find(
                (r) => r.tenantId === where.tenantId && r.reportDate === where.reportDate,
              ) ?? null,
            ),
            save: jest.fn(async (row: ReconciliationReportEntity) => {
              const idx = reports.findIndex(
                (r) => r.tenantId === row.tenantId && r.reportDate === row.reportDate,
              );
              const saved = { ...row, ranAt: row.ranAt ?? new Date(), updatedAt: new Date() };
              if (idx >= 0) reports[idx] = saved;
              else reports.push(saved);
              return saved;
            }),
          },
        },
        {
          provide: getRepositoryToken(PaymentWebhookEventEntity),
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn(async () => webhooks),
            })),
          },
        },
        {
          provide: getRepositoryToken(LedgerJournalEntity),
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn(async () => journals),
            })),
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
          provide: getRepositoryToken(PaymentIntentEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: { id: string } }) =>
              ({ id: where.id, amount: '50000000' }) as PaymentIntentEntity,
            ),
          },
        },
        {
          provide: ReconciliationAlertService,
          useValue: alertMock,
        },
      ],
    }).compile();

    service = module.get(ReconciliationService);
  });

  it('returns MATCHED when gateway webhooks align with ledger journals', async () => {
    webhooks.push({
      id: '1',
      eventId: 'evt_01',
      tenantId: 'ten_dev_01',
      eventType: 'payment.success',
      transactionId: 'MOCK_TXN',
      paymentIntentId: 'pi_01',
      status: 'PROCESSED',
      payload: { amount: 50_000_000 },
      result: null,
      ledgerEntryId: 'le_01',
      createdAt: new Date('2026-07-28T10:00:00+07:00'),
    });

    journals.push({
      id: 'jrn_01',
      tenantId: 'ten_dev_01',
      webhookEventId: 'evt_01',
      bookingId: 'bk_01',
      paymentIntentId: 'pi_01',
      reference: 'MOCK_TXN',
      postedAt: new Date('2026-07-28T10:00:00+07:00'),
    });

    entries.push(
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
        postedAt: new Date(),
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
        postedAt: new Date(),
      },
    );

    const report = await service.reconcileDay('ten_dev_01', '2026-07-28');

    expect(report.status).toBe('MATCHED');
    expect(Number(report.gatewayTotal)).toBe(50_000_000);
    expect(Number(report.ledgerTotal)).toBe(50_000_000);
    expect(report.discrepancies).toHaveLength(0);
  });

  it('returns MISMATCH when ledger exists without gateway webhook', async () => {
    journals.push({
      id: 'jrn_orphan',
      tenantId: 'ten_dev_01',
      webhookEventId: 'evt_orphan',
      bookingId: 'bk_01',
      paymentIntentId: 'pi_orphan',
      reference: 'MOCK',
      postedAt: new Date('2026-07-28T12:00:00+07:00'),
    });

    entries.push({
      id: 'le_debit',
      journalId: 'jrn_orphan',
      tenantId: 'ten_dev_01',
      account: 'CASH_MOCK',
      side: 'DEBIT',
      amount: '1000000',
      currency: 'VND',
      referenceType: 'payment',
      referenceId: 'pi_orphan',
      postedAt: new Date(),
    });

    const report = await service.reconcileDay('ten_dev_01', '2026-07-28');

    expect(report.status).toBe('MISMATCH');
    expect(report.discrepancies.some((d) => d.type === 'LEDGER_ONLY')).toBe(true);
  });

  it('notifies ops alert stub on MISMATCH (P3-S3-03)', async () => {
    journals.push({
      id: 'jrn_alert',
      tenantId: 'ten_dev_01',
      webhookEventId: 'evt_alert',
      bookingId: 'bk_01',
      paymentIntentId: 'pi_alert',
      reference: 'MOCK',
      postedAt: new Date('2026-07-29T12:00:00+07:00'),
    });
    entries.push({
      id: 'le_alert',
      journalId: 'jrn_alert',
      tenantId: 'ten_dev_01',
      account: 'CASH_MOCK',
      side: 'DEBIT',
      amount: '1000000',
      currency: 'VND',
      referenceType: 'payment',
      referenceId: 'pi_alert',
      postedAt: new Date(),
    });

    await service.reconcileDay('ten_dev_01', '2026-07-29');
    expect(alertMock.notifyMismatch).toHaveBeenCalled();
  });
});
