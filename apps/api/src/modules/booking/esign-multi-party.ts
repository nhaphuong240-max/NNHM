import { createHash } from 'crypto';

export const PARTY_TYPES = ['BUYER', 'DEVELOPER', 'AGENCY', 'SALES', 'INTERNAL_APPROVER'] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export type SigningMode = 'SEQUENTIAL' | 'PARALLEL';

export type SignerTurnRow = {
  id: string;
  signOrder: number;
  groupId: string | null;
  status: string;
};

export function isPartyType(value: string): value is PartyType {
  return (PARTY_TYPES as readonly string[]).includes(value);
}

export function hashDocumentText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Same sign_order or the same group can proceed together. Lower sign_order must be SIGNED first when sequential. */
export function signerTurn(input: {
  mode: SigningMode;
  signer: SignerTurnRow;
  roster: SignerTurnRow[];
}): 'ok' | 'not-turn' | 'already-signed' {
  if (input.signer.status === 'SIGNED') return 'already-signed';
  if (input.mode === 'PARALLEL') return 'ok';
  const blocking = input.roster.filter((row) => {
    if (row.id === input.signer.id) return false;
    if (row.status === 'SIGNED') return false;
    if (input.signer.groupId && row.groupId === input.signer.groupId) return false;
    return row.signOrder < input.signer.signOrder;
  });
  return blocking.length > 0 ? 'not-turn' : 'ok';
}

export function allSignersSigned(roster: SignerTurnRow[]): boolean {
  return roster.length > 0 && roster.every((row) => row.status === 'SIGNED');
}

export const ESIGN_COMPLETION_COPY_CHANNEL_ENV = 'ESIGN_COMPLETION_COPY_CHANNEL';
export const ESIGN_DOWNLOAD_TTL_MS_ENV = 'ESIGN_DOWNLOAD_TTL_MS';

/** Empty or any other value: do not send. Not a signed product default. */
export function readCompletionCopyChannel(read: (key: string) => string | undefined): 'EMAIL' | 'SMS' | null {
  const raw = (read(ESIGN_COMPLETION_COPY_CHANNEL_ENV) ?? '').trim().toUpperCase();
  return raw === 'EMAIL' || raw === 'SMS' ? raw : null;
}
