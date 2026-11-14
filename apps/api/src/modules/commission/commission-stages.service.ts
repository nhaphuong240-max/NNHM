import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionEntryEntity } from '../../database/entities/commission-entry.entity';

const STAGE_ROLES = ['FINANCE_ADMIN', 'OPS_ADMIN'] as const;

export type CommissionStageView = {
  entryId: string;
  currency: 'UNCHANGED';
  earned: string;
  payable: string;
  paid: '0';
};

/** Read the stored amount into separate buckets. Does not recompute a rate or mark a payout paid. */
export function stageCommissionAmount(payoutStatus: string, amount: string): Pick<CommissionStageView, 'earned' | 'payable' | 'paid'> {
  if (payoutStatus === 'SIMULATED' || payoutStatus === 'SKIPPED' || payoutStatus === 'PENDING' || payoutStatus === 'HOLDBACK') {
    const earned = payoutStatus === 'SIMULATED' || payoutStatus === 'SKIPPED' ? '0' : amount;
    return { earned, payable: '0', paid: '0' };
  }
  if (payoutStatus === 'APPROVED' || payoutStatus === 'PAID') {
    return { earned: amount, payable: amount, paid: '0' };
  }
  return { earned: '0', payable: '0', paid: '0' };
}

@Injectable()
export class CommissionStagesService {
  constructor(
    @InjectRepository(CommissionEntryEntity)
    private readonly entries: Repository<CommissionEntryEntity>,
  ) {}

  async read(input: {
    tenantId: string;
    actorRole: string | undefined;
    entryId: string;
  }): Promise<CommissionStageView> {
    if (!input.actorRole || !STAGE_ROLES.includes(input.actorRole as (typeof STAGE_ROLES)[number])) {
      throw new ForbiddenException({ detail: 'commission stages require a finance operator' });
    }
    const entry = await this.entries.findOne({ where: { id: input.entryId, tenantId: input.tenantId } });
    if (!entry) throw new NotFoundException({ detail: 'commission entry not found' });
    return {
      entryId: entry.id,
      currency: 'UNCHANGED',
      ...stageCommissionAmount(entry.payoutStatus, entry.amount),
    };
  }
}
