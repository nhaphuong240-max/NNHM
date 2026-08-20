import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { LedgerEntryEntity } from '../../database/entities/ledger-entry.entity';
import { LedgerJournalEntity } from '../../database/entities/ledger-journal.entity';
import type { PaymentMethod } from '../../database/entities/payment-intent.entity';

export interface WritePaymentSuccessInput {
  tenantId: string;
  bookingId: string;
  paymentIntentId: string;
  amount: number;
  transactionId: string;
  webhookEventId: string;
  method: PaymentMethod;
}

export interface WritePaymentRefundInput {
  tenantId: string;
  bookingId: string;
  paymentIntentId: string;
  refundId: string;
  amount: number;
  transactionId: string;
  method: PaymentMethod;
}

export interface WritePaymentSuccessResult {
  journalId: string;
  entryId: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  balanced: boolean;
}

@Injectable()
export class LedgerWriteService {
  constructor(
    @InjectRepository(LedgerJournalEntity)
    private readonly journals: Repository<LedgerJournalEntity>,
    @InjectRepository(LedgerEntryEntity)
    private readonly entries: Repository<LedgerEntryEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** FR-PAY-03 / BR-18 — 2 lines per journal: DEBIT cash, CREDIT liability */
  async writePaymentSuccess(input: WritePaymentSuccessInput): Promise<WritePaymentSuccessResult> {
    const existing = await this.journals.findOne({
      where: { webhookEventId: input.webhookEventId },
    });

    if (existing) {
      return this.resultFromJournal(existing);
    }

    const debitAccount = input.method === 'VNPAY' ? 'CASH_VNPAY' : 'CASH_MOCK';
    const creditAccount = 'DEPOSIT_LIABILITY';
    const journalId = `jrn_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const debitId = `le_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const creditId = `le_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const amount = String(input.amount);

    await this.dataSource.transaction(async (manager) => {
      await manager.save(LedgerJournalEntity, {
        id: journalId,
        tenantId: input.tenantId,
        webhookEventId: input.webhookEventId,
        bookingId: input.bookingId,
        paymentIntentId: input.paymentIntentId,
        reference: input.transactionId,
      });

      await manager.save(LedgerEntryEntity, [
        {
          id: debitId,
          journalId,
          tenantId: input.tenantId,
          account: debitAccount,
          side: 'DEBIT',
          amount,
          currency: 'VND',
          referenceType: 'payment',
          referenceId: input.paymentIntentId,
        },
        {
          id: creditId,
          journalId,
          tenantId: input.tenantId,
          account: creditAccount,
          side: 'CREDIT',
          amount,
          currency: 'VND',
          referenceType: 'payment',
          referenceId: input.paymentIntentId,
        },
      ]);
    });

    const journal = await this.journals.findOneOrFail({ where: { id: journalId } });
    const result = await this.resultFromJournal(journal);

    if (!result.balanced) {
      throw new InternalServerErrorException({
        detail: 'Ledger journal is not balanced (BR-18)',
        journalId,
      });
    }

    return result;
  }

  /** ADR-004 reversal — DEBIT DEPOSIT_LIABILITY, CREDIT CASH_* */
  async writePaymentRefund(input: WritePaymentRefundInput): Promise<WritePaymentSuccessResult> {
    const webhookEventId = `refund_${input.refundId}`;
    const existing = await this.journals.findOne({ where: { webhookEventId } });

    if (existing) {
      return this.resultFromJournal(existing);
    }

    const creditAccount = input.method === 'VNPAY' ? 'CASH_VNPAY' : 'CASH_MOCK';
    const debitAccount = 'DEPOSIT_LIABILITY';
    const journalId = `jrn_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const debitId = `le_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const creditId = `le_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const amount = String(input.amount);

    await this.dataSource.transaction(async (manager) => {
      await manager.save(LedgerJournalEntity, {
        id: journalId,
        tenantId: input.tenantId,
        webhookEventId,
        bookingId: input.bookingId,
        paymentIntentId: input.paymentIntentId,
        reference: input.transactionId,
      });

      await manager.save(LedgerEntryEntity, [
        {
          id: debitId,
          journalId,
          tenantId: input.tenantId,
          account: debitAccount,
          side: 'DEBIT',
          amount,
          currency: 'VND',
          referenceType: 'refund',
          referenceId: input.refundId,
        },
        {
          id: creditId,
          journalId,
          tenantId: input.tenantId,
          account: creditAccount,
          side: 'CREDIT',
          amount,
          currency: 'VND',
          referenceType: 'refund',
          referenceId: input.refundId,
        },
      ]);
    });

    const journal = await this.journals.findOneOrFail({ where: { id: journalId } });
    const result = await this.resultFromJournal(journal);

    if (!result.balanced) {
      throw new InternalServerErrorException({
        detail: 'Refund ledger journal is not balanced (BR-18)',
        journalId,
      });
    }

    return result;
  }

  /** T5-S6 — NHNN/SBV escrow release rail (ESCROW_HOLD → ESCROW_RELEASE) */
  async writeEscrowRelease(input: {
    tenantId: string;
    accountId: string;
    releaseId: string;
    amount: number;
    milestoneId: string;
  }): Promise<WritePaymentSuccessResult> {
    const webhookEventId = `escrow_release_${input.releaseId}`;
    const existing = await this.journals.findOne({ where: { webhookEventId } });
    if (existing) return this.resultFromJournal(existing);

    const debitAccount = 'ESCROW_HOLD';
    const creditAccount = 'ESCROW_RELEASE';
    const journalId = `jrn_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const debitId = `le_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const creditId = `le_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const amount = String(input.amount);

    await this.dataSource.transaction(async (manager) => {
      await manager.save(LedgerJournalEntity, {
        id: journalId,
        tenantId: input.tenantId,
        webhookEventId,
        bookingId: input.accountId,
        paymentIntentId: input.releaseId,
        reference: input.milestoneId,
      });

      await manager.save(LedgerEntryEntity, [
        {
          id: debitId,
          journalId,
          tenantId: input.tenantId,
          account: debitAccount,
          side: 'DEBIT',
          amount,
          currency: 'VND',
          referenceType: 'escrow_release',
          referenceId: input.releaseId,
        },
        {
          id: creditId,
          journalId,
          tenantId: input.tenantId,
          account: creditAccount,
          side: 'CREDIT',
          amount,
          currency: 'VND',
          referenceType: 'escrow_release',
          referenceId: input.releaseId,
        },
      ]);
    });

    const journal = await this.journals.findOneOrFail({ where: { id: journalId } });
    return this.resultFromJournal(journal);
  }

  async isJournalBalanced(journalId: string): Promise<boolean> {
    const lines = await this.entries.find({ where: { journalId } });
    const debit = lines
      .filter((l) => l.side === 'DEBIT')
      .reduce((sum, l) => sum + Number(l.amount), 0);
    const credit = lines
      .filter((l) => l.side === 'CREDIT')
      .reduce((sum, l) => sum + Number(l.amount), 0);
    return debit === credit && debit > 0;
  }

  private async resultFromJournal(journal: LedgerJournalEntity): Promise<WritePaymentSuccessResult> {
    const lines = await this.entries.find({ where: { journalId: journal.id } });
    const debit = lines.find((l) => l.side === 'DEBIT');
    const credit = lines.find((l) => l.side === 'CREDIT');
    const debitAmount = debit ? Number(debit.amount) : 0;
    const creditAmount = credit ? Number(credit.amount) : 0;

    return {
      journalId: journal.id,
      entryId: debit?.id ?? journal.id,
      debitAccount: debit?.account ?? '',
      creditAccount: credit?.account ?? '',
      amount: debitAmount,
      balanced: debitAmount === creditAmount && debitAmount > 0,
    };
  }
}
