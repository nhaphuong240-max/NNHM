import type { ContractSignClaims } from './contract-sign-token';

export type StoredSignTicket = {
  jti: string;
  tenantId: string;
  contractId: string;
  signerId: string;
  requestId: string;
  channel: string;
  consumedAtMs: number | null;
};

export type TicketUse = 'ok' | 'missing' | 'replay' | 'mismatch';

export function ticketUse(record: StoredSignTicket | null, claims: ContractSignClaims): TicketUse {
  if (!record) return 'missing';
  if (record.consumedAtMs !== null) return 'replay';
  if (
    record.jti !== claims.jti ||
    record.tenantId !== claims.tenantId ||
    record.contractId !== claims.contractId ||
    record.signerId !== claims.signerId ||
    record.requestId !== claims.requestId ||
    record.channel !== claims.channel
  ) {
    return 'mismatch';
  }
  return 'ok';
}
