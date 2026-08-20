import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { EscrowAccountEntity } from '../../database/entities/escrow-account.entity';
import { EscrowMilestoneEntity } from '../../database/entities/escrow-milestone.entity';
import { EscrowReleaseEventEntity } from '../../database/entities/escrow-release-event.entity';
import { AuditService } from '../audit/audit.service';
import { LedgerWriteService } from '../ledger/ledger-write.service';
import {
  buildDefaultMilestones,
  releaseMilestone,
  syncMilestonesWithBooking,
  type EscrowAccount,
} from './payment-escrow.util';

@Injectable()
export class PaymentEscrowService {
  constructor(
    @InjectRepository(EscrowAccountEntity)
    private readonly accounts: Repository<EscrowAccountEntity>,
    @InjectRepository(EscrowMilestoneEntity)
    private readonly milestones: Repository<EscrowMilestoneEntity>,
    @InjectRepository(EscrowReleaseEventEntity)
    private readonly releases: Repository<EscrowReleaseEventEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    private readonly audit: AuditService,
    private readonly ledger: LedgerWriteService,
    private readonly config: ConfigService,
  ) {}

  /** UC-PAY-06 · SCR-FIN-003 · T5-S6 */
  async listAccounts(tenantId: string) {
    const rows = await this.accounts.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 30,
    });
    const data = await Promise.all(rows.map((row) => this.hydrateAccount(row)));
    return {
      data,
      meta: {
        tenantId,
        count: data.length,
        uc: ['UC-PAY-06', 'T5-S6'],
        screen: 'SCR-FIN-003',
        nhnnBadge: this.config.get('ESCROW_BANK_PARTNER_ENABLED') === 'true',
      },
    };
  }

  async createAccount(
    tenantId: string,
    input: { bookingId: string; totalAmount?: number },
    actorId?: string,
  ) {
    const booking = await this.bookings.findOne({
      where: { id: input.bookingId.trim(), tenantId },
    });
    if (!booking) {
      throw new NotFoundException({ detail: `Booking ${input.bookingId} not found` });
    }

    const totalAmount = input.totalAmount ?? Number(booking.depositAmount ?? 0) * 3;
    const accountId = `esc_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const milestoneDefs = syncMilestonesWithBooking(
      buildDefaultMilestones(totalAmount),
      booking.status,
    );

    await this.accounts.save({
      id: accountId,
      tenantId,
      bookingId: booking.id,
      totalAmount: String(totalAmount),
      heldAmount: String(totalAmount),
      releasedAmount: '0',
      status: 'ACTIVE',
      regulatoryScope: 'ESCROW_NHNN',
    });

    for (const m of milestoneDefs) {
      await this.milestones.save({
        id: `${accountId}_${m.id}`,
        tenantId,
        accountId,
        label: m.label,
        amount: String(m.amount),
        condition: m.condition,
        status: m.status,
        releasedAt: null,
      });
    }

    await this.audit.append({
      tenantId,
      entityType: 'escrow_account',
      entityId: accountId,
      action: 'CREATE',
      payload: { bookingId: booking.id, totalAmount, regulatoryScope: 'ESCROW_NHNN' },
      actorId: actorId ?? null,
    });

    const account = await this.hydrateAccount(
      await this.accounts.findOneOrFail({ where: { id: accountId } }),
    );
    return { data: account, meta: { uc: ['UC-PAY-06', 'T5-S6'], screen: 'SCR-FIN-003' } };
  }

  async releaseMilestone(
    tenantId: string,
    accountId: string,
    milestoneId: string,
    input: { financeApproved?: boolean; complianceApproved?: boolean; bankConfirmed?: boolean },
    actorId?: string,
  ) {
    const row = await this.accounts.findOne({
      where: { id: accountId.trim(), tenantId },
    });
    if (!row) throw new NotFoundException({ detail: `Escrow account ${accountId} not found` });

    const booking = await this.bookings.findOne({ where: { id: row.bookingId, tenantId } });
    const account = await this.hydrateAccount(row);
    const synced = booking
      ? { ...account, milestones: syncMilestonesWithBooking(account.milestones, booking.status) }
      : account;

    const bankRequired = this.config.get('ESCROW_BANK_PARTNER_ENABLED') === 'true';
    if (!input.financeApproved || !input.complianceApproved) {
      throw new UnprocessableEntityException({
        detail: 'Dual approval required: finance + compliance (NHNN/SBV pilot)',
      });
    }
    if (bankRequired && !input.bankConfirmed) {
      throw new UnprocessableEntityException({
        detail: 'Bank custody webhook confirmation required (ESCROW_BANK_PARTNER_ENABLED)',
      });
    }

    const updated = releaseMilestone(synced, milestoneId.trim());
    const target = updated.milestones.find((m) => m.id === milestoneId.trim());
    if (!target) throw new NotFoundException({ detail: `Milestone ${milestoneId} not found` });

    await this.milestones.update(
      { id: `${accountId}_${milestoneId.trim()}`, tenantId },
      { status: 'RELEASED', releasedAt: new Date() },
    );
    await this.accounts.update(
      { id: accountId, tenantId },
      {
        heldAmount: String(updated.heldAmount),
        releasedAmount: String(updated.releasedAmount),
        status: updated.status,
      },
    );

    const releaseId = `erl_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    await this.releases.save({
      id: releaseId,
      tenantId,
      accountId,
      milestoneId: milestoneId.trim(),
      amount: String(target.amount),
      approvedByFinance: Boolean(input.financeApproved),
      approvedByCompliance: Boolean(input.complianceApproved),
      bankWebhookConfirmed: bankRequired ? Boolean(input.bankConfirmed) : true,
      ledgerJournalId: null,
    });

    await this.ledger.writeEscrowRelease({
      tenantId,
      accountId,
      releaseId,
      amount: target.amount,
      milestoneId: milestoneId.trim(),
    });

    await this.audit.append({
      tenantId,
      entityType: 'escrow_account',
      entityId: accountId,
      action: 'RELEASE',
      payload: { milestoneId, releaseId, amount: target.amount },
      actorId: actorId ?? null,
    });

    return {
      data: updated,
      meta: { uc: ['UC-PAY-06', 'T5-S6'], screen: 'SCR-FIN-003', regulatoryScope: 'ESCROW_NHNN' },
    };
  }

  async countEscrowForExport(tenantId: string, from: Date, to: Date) {
    return this.accounts
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.created_at BETWEEN :from AND :to', { from, to })
      .getCount();
  }

  private async hydrateAccount(row: EscrowAccountEntity): Promise<EscrowAccount> {
    const booking = await this.bookings.findOne({ where: { id: row.bookingId, tenantId: row.tenantId } });
    const milestoneRows = row.milestones ?? (await this.milestones.find({ where: { accountId: row.id } }));
    const milestones = milestoneRows.map((m) => ({
      id: m.id.replace(`${row.id}_`, ''),
      label: m.label,
      amount: Number(m.amount),
      condition: m.condition,
      status: m.status,
      releasedAt: m.releasedAt?.toISOString(),
    }));
    const synced = booking ? syncMilestonesWithBooking(milestones, booking.status) : milestones;
    return {
      id: row.id,
      bookingId: row.bookingId,
      totalAmount: Number(row.totalAmount),
      heldAmount: Number(row.heldAmount),
      releasedAmount: Number(row.releasedAmount),
      status: row.status,
      milestones: synced,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
