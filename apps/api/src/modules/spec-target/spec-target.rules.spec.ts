import {
  allocationAllowsPlacement,
  claimHold,
  claimOneOfMany,
  copilotAnswer,
  copilotMayWrite,
  decideAccess,
  exportJobAllowed,
  mapLegacyRole,
  maskPhone,
  priceWindowsOverlap,
  quoteIsImmutable,
  refundWithinNet,
  reviewItemsFromLegacyRoles,
  serverObligationAmount,
  settlementLabel,
} from './spec-target.rules';
import { mintPublicTenantToken, tenantIdFromPublicToken } from '../../common/public-tenant-token';

const now = new Date('2026-11-10T00:00:00Z');

describe('spec target rules', () => {
  it('G01 denies a grant from another tenant or an expired grant', () => {
    const grant = {
      tenantId: 'ten_a',
      granteeOrgId: 'org_a',
      projectId: 'prj_1',
      action: 'booking.hold',
      resource: 'unit',
      expiresAt: new Date('2026-12-01T00:00:00Z'),
      status: 'ACTIVE' as const,
    };
    expect(
      decideAccess({
        actorTenantId: 'ten_b',
        actorOrgId: 'org_a',
        action: 'booking.hold',
        resource: 'unit',
        projectId: 'prj_1',
        now,
        grants: [grant],
      }).allow,
    ).toBe(false);
    expect(
      decideAccess({
        actorTenantId: 'ten_a',
        actorOrgId: 'org_a',
        action: 'booking.hold',
        resource: 'unit',
        projectId: 'prj_1',
        now,
        grants: [{ ...grant, expiresAt: new Date('2026-01-01T00:00:00Z') }],
      }).allow,
    ).toBe(false);
    expect(
      decideAccess({
        actorTenantId: 'ten_a',
        actorOrgId: 'org_a',
        action: 'booking.hold',
        resource: 'unit',
        projectId: 'prj_1',
        now,
        grants: [grant],
      }).allow,
    ).toBe(true);
  });

  it('does not turn a legacy role into a project grant', () => {
    const items = reviewItemsFromLegacyRoles([{ userId: 'usr_1', role: 'AGENT' }]);
    expect(mapLegacyRole('AGENT')).toBe('SALES');
    expect(items[0].projectId).toBeNull();
    expect(items[0].needsHumanApproval).toBe(true);
  });

  it('G02 lets one of fifty claims take the hold', async () => {
    let taken = false;
    const wins = await claimOneOfMany(50, async () => {
      if (taken) return false;
      taken = true;
      return true;
    });
    expect(wins).toBe(1);
    expect(claimHold([{ unitId: 'un_1', status: 'RESERVED' }], 'un_1').ok).toBe(false);
  });

  it('G05 and G06 keep sandbox money off the paid label', () => {
    expect(serverObligationAmount('50000000')).toBe(50_000_000);
    expect(serverObligationAmount(null)).toBeNull();
    expect(refundWithinNet(100, 40, 60)).toBe(true);
    expect(refundWithinNet(100, 40, 61)).toBe(false);
    expect(settlementLabel('SIMULATED')).toBe('SIMULATED');
    expect(settlementLabel('SKIPPED')).not.toBe('PAID');
  });

  it('G09 masks a phone and refuses an unapproved export', () => {
    expect(maskPhone('0901234567')).toBe('090****67');
    expect(
      exportJobAllowed({
        purpose: 'audit',
        approvedBy: 'usr_checker',
        requesterId: 'usr_maker',
        rowCount: 10,
        rowLimit: 100,
        expiresAt: new Date('2026-12-01T00:00:00Z'),
        now,
      }).ok,
    ).toBe(true);
    expect(
      exportJobAllowed({
        purpose: 'audit',
        approvedBy: 'usr_maker',
        requesterId: 'usr_maker',
        rowCount: 10,
        rowLimit: 100,
        expiresAt: new Date('2026-12-01T00:00:00Z'),
        now,
      }).ok,
    ).toBe(false);
  });

  it('blocks overlapping prices, accepted quote edits, and AI money writes', () => {
    expect(
      priceWindowsOverlap(
        { from: new Date('2026-01-01'), to: new Date('2026-06-01') },
        { from: new Date('2026-05-01'), to: null },
      ),
    ).toBe(true);
    expect(quoteIsImmutable('ACCEPTED')).toBe(true);
    expect(allocationAllowsPlacement({
      status: 'ACTIVE',
      expiresAt: new Date('2026-12-01'),
      now,
      unitId: 'un_1',
      requestedUnitId: 'un_1',
    })).toBe(true);
    expect(copilotMayWrite('price')).toBe(false);
    expect(copilotAnswer([])).toEqual({ abstain: true });
    expect(copilotAnswer(['listing:un_1'])).toMatchObject({ citations: ['listing:un_1'] });
  });

  it('reads the tenant from a public token and ignores a bare header shape', () => {
    const token = mintPublicTenantToken('ten_dev_01', 'catalogpublic');
    expect(tenantIdFromPublicToken(token)).toBe('ten_dev_01');
    expect(tenantIdFromPublicToken('ten_other')).toBeNull();
  });
});
