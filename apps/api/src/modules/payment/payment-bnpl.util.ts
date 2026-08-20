export type BnplInstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export type BnplInstallment = {
  id: string;
  dueDate: string;
  amount: number;
  status: BnplInstallmentStatus;
  paidAt?: string;
};

export type BnplApplication = {
  id: string;
  bookingId: string;
  planLabel: string;
  totalAmount: number;
  installmentCount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED';
  externalId?: string;
  partnerReason?: string;
  installments: BnplInstallment[];
  createdAt: string;
};

export function buildBnplInstallments(totalAmount: number, count = 3): BnplInstallment[] {
  const base = Math.floor(totalAmount / count);
  const remainder = totalAmount - base * count;
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: `ins_${i + 1}`,
    dueDate: new Date(now + (i + 1) * 30 * 86400000).toISOString().slice(0, 10),
    amount: i === count - 1 ? base + remainder : base,
    status: 'PENDING' as const,
  }));
}

export const BNPL_PLANS = [
  { id: 'bnpl_3', label: '3 kỳ · 0% pilot', installments: 3 },
  { id: 'bnpl_6', label: '6 kỳ · partner fee', installments: 6 },
];
