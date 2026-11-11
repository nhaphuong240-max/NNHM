import { getMetadataArgsStorage } from 'typeorm';
import { databaseEntities } from './database.entities';

type IndexArgs = { target: { name?: string }; columns?: string[]; unique?: boolean };

function indexes(className: string, unique: boolean): string[][] {
  return (getMetadataArgsStorage().indices as IndexArgs[])
    .filter((index) => index.target?.name === className && Boolean(index.unique) === unique)
    .map((index) => [...(index.columns ?? [])]);
}

describe('TypeORM composite index metadata', () => {
  it('registers every entity before reading index metadata', () => {
    expect(databaseEntities.length).toBe(94);
  });

  it('keeps the approved money uniques on the full column set', () => {
    expect(indexes('BookingEntity', true)).toContainEqual(['tenantId', 'idempotencyKey']);
    expect(indexes('PaymentIntentEntity', true)).toContainEqual(['tenantId', 'idempotencyKey']);
    expect(indexes('RefundEntity', true)).toContainEqual(['tenantId', 'idempotencyKey']);
    expect(indexes('CommissionSnapshotEntity', true)).toContainEqual(['tenantId', 'bookingId']);
    expect(indexes('PaymentWebhookEventEntity', true)).toContainEqual(['eventId']);
    expect(indexes('LedgerJournalEntity', true)).toContainEqual(['webhookEventId']);
    for (const columns of [
      ['tenantId', 'idempotencyKey'],
      ['tenantId', 'bookingId'],
    ]) {
      expect(columns.length).toBeGreaterThan(1);
    }
  });

  it('keeps the three wide indexes on the approved columns', () => {
    expect(indexes('AiLeadCopilotDraftEntity', false)).toContainEqual([
      'tenantId',
      'leadId',
      'createdAt',
    ]);
    expect(indexes('AnalyticsEventEntity', false)).toContainEqual(['tenantId', 'name', 'createdAt']);
    expect(indexes('SeekerOtpChallengeEntity', false)).toContainEqual([
      'tenantId',
      'phoneNormalized',
      'createdAt',
    ]);
  });
});
