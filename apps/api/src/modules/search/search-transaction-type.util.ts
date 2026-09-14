import { BusinessErrorCode, throwBusinessError } from '../../common/business-error';

export type SearchTransactionType = 'sale' | 'rent' | 'project';

const VALID: SearchTransactionType[] = ['sale', 'rent', 'project'];

/** Map public intent (buy/rent/project) → index transactionType. */
export function intentToTransactionType(intent?: string): SearchTransactionType | undefined {
  if (!intent?.trim()) return undefined;
  const v = intent.trim().toLowerCase();
  if (v === 'buy' || v === 'sale' || v === 'mua') return 'sale';
  if (v === 'rent' || v === 'thue') return 'rent';
  if (v === 'project' || v === 'du-an') return 'project';
  return undefined;
}

export function parseTransactionType(raw?: string): SearchTransactionType | undefined {
  if (!raw?.trim()) return undefined;
  const v = raw.trim().toLowerCase() as SearchTransactionType;
  if (!VALID.includes(v)) {
    throwBusinessError(BusinessErrorCode.VALIDATION_FAILED, `transactionType must be sale|rent|project`);
  }
  return v;
}

export function assertIndexTransactionType(
  listingTransactionType: string | null | undefined,
  unitId: string,
): SearchTransactionType {
  const t = (listingTransactionType ?? 'sale').toLowerCase() as SearchTransactionType;
  if (!VALID.includes(t)) {
    throwBusinessError(
      BusinessErrorCode.INTENT_INDEX_MISS,
      `Listing ${unitId} missing valid transactionType for search index`,
      { unitId, transactionType: listingTransactionType },
    );
  }
  return t;
}
