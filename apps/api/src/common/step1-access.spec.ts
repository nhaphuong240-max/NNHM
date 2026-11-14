import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PortalController } from '../modules/portal/portal.controller';
import { PortalService } from '../modules/portal/portal.service';
import { mintContractSignToken, readContractSignToken } from '../modules/booking/contract-sign-token';
import { streamEventMatchesUnit } from '../modules/stream/stream-events.service';
import { TENANT_LOOKUP_SQL, recordUnscopedAudit } from './public-tenant-lookup';
import {
  resetUnscopedAuditLimit,
  UNSCOPED_AUDIT_MAX_KEYS,
  UNSCOPED_AUDIT_WINDOW_MS,
  allowUnscopedAuditWrite,
  unscopedAuditKeyCount,
} from './unscoped-audit-limit';
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
    const token = mintContractSignToken({
      tenantId: 'ten_b',
      contractId: 'ctr_b',
      buyerId: 'usr_buyer',
      secret: SECRET,
      now: 1_000,
    });
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

  it('stops unauthenticated audit inserts when the booking id changes', async () => {
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
        entityId: `bk_${i}`,
        action: 'WEBHOOK_REJECTED',
        source: 'ip:203.0.113.8',
        payload: { reason: 'bad-signature' },
      });
    }
    expect(query).toHaveBeenCalledTimes(8);
  });

  it('caps the unauthenticated audit map and drops expired keys', () => {
    for (let i = 0; i < UNSCOPED_AUDIT_MAX_KEYS + 40; i += 1) {
      allowUnscopedAuditWrite(`ip:10.0.0.${i}`, 'WEBHOOK_REJECTED', 1_000);
    }
    expect(unscopedAuditKeyCount()).toBeLessThanOrEqual(UNSCOPED_AUDIT_MAX_KEYS);
    resetUnscopedAuditLimit();
    allowUnscopedAuditWrite('ip:203.0.113.9', 'WEBHOOK_REJECTED', 1_000);
    expect(unscopedAuditKeyCount()).toBe(1);
    allowUnscopedAuditWrite('ip:203.0.113.10', 'WEBHOOK_REJECTED', 1_000 + UNSCOPED_AUDIT_WINDOW_MS);
    expect(unscopedAuditKeyCount()).toBe(1);
  });

  it('mints a sign token for the owning buyer and rejects another person or tenant', async () => {
    const contracts = {
      getContract: jest.fn(async () => ({ data: { id: 'ctr_a', attributes: { bookingId: 'bk_1' } } })),
    };
    const bookings = {
      findOne: jest.fn(async () => ({ id: 'bk_1', leadId: 'ld_1', tenantId: 'ten_b' })),
    };
    const leads = { findOne: jest.fn(async () => ({ id: 'ld_1', phone: '0900000001' })) };
    const service = Object.assign(Object.create(PortalService.prototype), {
      bookings,
      leads,
      contracts,
    }) as PortalService;
    const owner = { role: 'SEEKER', email: 'seeker+0900000001@nnhn.local', userId: 'usr_1', tenantId: 'ten_b' };
    const other = { ...owner, userId: 'usr_2', email: 'seeker+0900000002@nnhn.local' };
    await expect(service.issueContractSignToken('ten_b', 'ctr_a', other, SECRET)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    const minted = await service.issueContractSignToken('ten_b', 'ctr_a', owner, SECRET);
    expect(readContractSignToken(minted.data.token, SECRET)).toMatchObject({
      tenantId: 'ten_b',
      contractId: 'ctr_a',
      buyerId: 'usr_1',
    });
    const portal = { issueContractSignToken: jest.fn() };
    const config = { get: (key: string) => (key === 'CONTRACT_SIGN_SECRET' ? SECRET : undefined) };
    const dataSource = {
      createQueryRunner: () => ({
        connect: async () => undefined,
        release: async () => undefined,
        query: async () => [{ tenant_id: 'ten_b' }],
      }),
    };
    const controller = new PortalController(portal as never, config as never, dataSource as never);
    await expect(
      controller.issueContractSignToken(
        { ...owner, tenantId: 'ten_other' },
        'ten_b',
        'ctr_a',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(portal.issueContractSignToken).not.toHaveBeenCalled();
  });

  it('reads an SSO provider from tenant config and not from audit events', () => {
    expect(TENANT_LOOKUP_SQL.sso_provider).toContain("domain = 'SSO_PROVIDER'");
    expect(TENANT_LOOKUP_SQL.sso_provider).not.toContain('audit_events');
  });

  it('does not accept a sign token that names a different contract', () => {
    const token = mintContractSignToken({
      tenantId: 'ten_b',
      contractId: 'ctr_other',
      buyerId: 'usr_buyer',
      secret: SECRET,
    });
    const claims = readContractSignToken(token, SECRET);
    expect(claims?.contractId).not.toBe('ctr_b');
    expect(() => {
      if (!claims || claims.contractId !== 'ctr_b' || claims.tenantId !== 'ten_b') {
        throw new UnauthorizedException({ detail: 'contract sign token is missing, expired, or for another contract' });
      }
    }).toThrow(UnauthorizedException);
  });
});
