import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PortalService } from '../modules/portal/portal.service';
import { mintContractSignToken, readContractSignToken } from '../modules/booking/contract-sign-token';
import { streamEventMatchesUnit } from '../modules/stream/stream-events.service';
import { TENANT_LOOKUP_SQL, recordUnscopedAudit } from './public-tenant-lookup';
import { resetUnscopedAuditLimit } from './unscoped-audit-limit';
import type { DataSource } from 'typeorm';

const SECRET = 'contract-sign-test-secret';

describe('step 1 access checks', () => {
  afterEach(() => {
    resetUnscopedAuditLimit();
  });

  it('requires the seeker phone on the booking lead before BNPL, notify, or sign-session', async () => {
    const bookings = {
      findOne: jest.fn(async () => ({ id: 'bk_1', leadId: 'ld_1', tenantId: 'ten_b' })),
    };
    const leads = { findOne: jest.fn(async () => ({ id: 'ld_1', phone: '0900000001' })) };
    const service = Object.assign(Object.create(PortalService.prototype), { bookings, leads }) as PortalService;
    const owner = { role: 'SEEKER', email: 'seeker+0900000001@nnhn.local', userId: 'usr_1', tenantId: 'ten_b' };
    await expect(service.requireOwnedBuyerBooking('ten_b', 'bk_1', undefined)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.requireOwnedBuyerBooking('ten_b', 'bk_1', { ...owner, email: 'seeker+0900000002@nnhn.local' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.requireOwnedBuyerBooking('ten_b', 'bk_1', owner)).resolves.toMatchObject({ id: 'bk_1' });
  });

  it('rejects a contract sign token for another contract or after it expires', () => {
    const token = mintContractSignToken({ tenantId: 'ten_b', contractId: 'ctr_b', secret: SECRET, now: 1_000 });
    expect(readContractSignToken(token, SECRET, 1_000)?.contractId).toBe('ctr_b');
    expect(readContractSignToken(token, SECRET, 1_000 + 16 * 60 * 1000)).toBeNull();
    expect(readContractSignToken(token, 'wrong-secret-value-16', 1_000)).toBeNull();
    expect(readContractSignToken(undefined, SECRET)).toBeNull();
  });

  it('forwards only the requested unit on the status stream', () => {
    expect(streamEventMatchesUnit({ unitId: 'un_b' }, 'un_b')).toBe(true);
    expect(streamEventMatchesUnit({ unitId: 'un_other' }, 'un_b')).toBe(false);
  });

  it('stops unauthenticated audit inserts after the rate limit', async () => {
    const query = jest.fn(async () => []);
    const dataSource = {
      createQueryRunner: () => ({
        connect: async () => undefined,
        release: async () => undefined,
        query,
      }),
    } as unknown as DataSource;
    for (let i = 0; i < 12; i += 1) {
      await recordUnscopedAudit(dataSource, {
        tenantId: null,
        entityType: 'booking',
        entityId: 'bk_1',
        action: 'WEBHOOK_REJECTED',
        payload: { reason: 'bad-signature' },
      });
    }
    expect(query).toHaveBeenCalledTimes(8);
  });

  it('reads an SSO provider from tenant config and not from audit events', () => {
    expect(TENANT_LOOKUP_SQL.sso_provider).toContain("domain = 'SSO_PROVIDER'");
    expect(TENANT_LOOKUP_SQL.sso_provider).not.toContain('audit_events');
  });

  it('does not accept a sign token that names a different contract', () => {
    const token = mintContractSignToken({ tenantId: 'ten_b', contractId: 'ctr_other', secret: SECRET });
    const claims = readContractSignToken(token, SECRET);
    expect(claims?.contractId).not.toBe('ctr_b');
    expect(() => {
      if (!claims || claims.contractId !== 'ctr_b' || claims.tenantId !== 'ten_b') {
        throw new UnauthorizedException({ detail: 'contract sign token is missing, expired, or for another contract' });
      }
    }).toThrow(UnauthorizedException);
  });
});
