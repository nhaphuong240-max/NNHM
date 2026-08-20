import type { BookingStatus } from '../../database/entities/booking.entity';
import { UnprocessableEntityException } from '@nestjs/common';

export type EscrowMilestoneStatus = 'PENDING' | 'MET' | 'RELEASED';

export type EscrowMilestone = {
  id: string;
  label: string;
  amount: number;
  condition: string;
  status: EscrowMilestoneStatus;
  releasedAt?: string;
};

export type EscrowAccount = {
  id: string;
  bookingId: string;
  totalAmount: number;
  heldAmount: number;
  releasedAmount: number;
  status: 'ACTIVE' | 'COMPLETED';
  milestones: EscrowMilestone[];
  createdAt: string;
};

export function buildDefaultMilestones(totalAmount: number): EscrowMilestone[] {
  const deposit = Math.round(totalAmount * 0.3);
  const contract = Math.round(totalAmount * 0.4);
  const handover = totalAmount - deposit - contract;
  return [
    {
      id: 'ms_deposit',
      label: 'Cọc giữ chỗ',
      amount: deposit,
      condition: 'Booking DEPOSITED',
      status: 'PENDING',
    },
    {
      id: 'ms_contract',
      label: 'Ký hợp đồng',
      amount: contract,
      condition: 'Contract SIGNED',
      status: 'PENDING',
    },
    {
      id: 'ms_handover',
      label: 'Bàn giao',
      amount: handover,
      condition: 'Handover checklist',
      status: 'PENDING',
    },
  ];
}

/** Sync milestone MET flags from booking lifecycle (production gate). */
export function syncMilestonesWithBooking(
  milestones: EscrowMilestone[],
  bookingStatus: BookingStatus,
): EscrowMilestone[] {
  return milestones.map((m) => {
    if (m.status === 'RELEASED') return m;
    if (m.id === 'ms_deposit' && bookingStatus === 'DEPOSITED') {
      return { ...m, status: 'MET' as const };
    }
    if (m.id === 'ms_contract' && bookingStatus === 'DEPOSITED') {
      return { ...m, status: 'MET' as const };
    }
    return m;
  });
}

export function assertMilestoneReleasable(milestone: EscrowMilestone | undefined) {
  if (!milestone) {
    throw new UnprocessableEntityException({ detail: 'Milestone not found' });
  }
  if (milestone.status === 'RELEASED') {
    throw new UnprocessableEntityException({ detail: 'Milestone already released' });
  }
  if (milestone.status !== 'MET') {
    throw new UnprocessableEntityException({
      detail: `Milestone ${milestone.id} not met — condition: ${milestone.condition}`,
    });
  }
}

export function releaseMilestone(account: EscrowAccount, milestoneId: string): EscrowAccount {
  const target = account.milestones.find((m) => m.id === milestoneId);
  assertMilestoneReleasable(target);

  const milestones = account.milestones.map((m) =>
    m.id === milestoneId
      ? { ...m, status: 'RELEASED' as const, releasedAt: new Date().toISOString() }
      : m,
  );
  const releasedAmount = milestones
    .filter((m) => m.status === 'RELEASED')
    .reduce((sum, m) => sum + m.amount, 0);
  const heldAmount = account.totalAmount - releasedAmount;
  const allReleased = milestones.every((m) => m.status === 'RELEASED');
  return {
    ...account,
    milestones,
    releasedAmount,
    heldAmount,
    status: allReleased ? 'COMPLETED' : 'ACTIVE',
  };
}
