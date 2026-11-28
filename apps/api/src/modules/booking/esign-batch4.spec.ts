import { BadRequestException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ContractArtifactService } from './contract-artifact.service';
import { canApproveContract, canApproveKyc } from '../identity/role-catalog';
import { KycController } from '../kyc/kyc.controller';
import { KycService } from '../kyc/kyc.service';
import { canAdvanceBookingToContracted } from './esign-multi-party';
import { SignaturePartyController } from './signature-party.controller';
import { SignaturePartyService } from './signature-party.service';

describe('esign batch 4 approve and kyc', () => {
  it('assigns contracts.approve to SALES_DIRECTOR and kyc.approve to FINANCE_ADMIN', () => {
    expect(canApproveContract('SALES_DIRECTOR')).toBe(true);
    expect(canApproveContract('FINANCE_ADMIN')).toBe(false);
    expect(canApproveContract('PROCEDURE_STAFF')).toBe(false);
    expect(canApproveContract('ADMIN')).toBe(false);
    expect(canApproveKyc('FINANCE_ADMIN')).toBe(true);
    expect(canApproveKyc('SALES_DIRECTOR')).toBe(false);
    expect(canApproveKyc('PROCEDURE_STAFF')).toBe(false);
    expect(canApproveKyc('AGENT')).toBe(false);
  });

  it('returns 200 for the assigned role and 403 for every other role', async () => {
    const approveProfile = jest.fn(async () => ({ data: { id: 'kyc_1' } }));
    const kyc = new KycController({ approveProfile } as never);
    await expect(
      kyc.approveProfile({ userId: 'usr_fin', role: 'FINANCE_ADMIN', tenantId: 'ten_b', email: 'a@x' }, 'USER', 'usr_x', {}),
    ).resolves.toEqual({ data: { id: 'kyc_1' } });
    expect(approveProfile).toHaveBeenCalled();
    for (const role of ['ADMIN', 'AGENT', 'SALES_DIRECTOR', 'PROCEDURE_STAFF', 'SEEKER']) {
      expect(() =>
        kyc.approveProfile({ userId: 'u', role, tenantId: 'ten_b', email: 'a@x' }, 'USER', 'usr_x', {}),
      ).toThrow(ForbiddenException);
    }

    const party = new SignaturePartyController({} as never, {} as never);
    await expect(
      party.review({ userId: 'usr_gdkd', role: 'SALES_DIRECTOR', tenantId: 'ten_b', email: 'a@x' }, 'ten_b', 'sreq_1', {
        decision: 'MAYBE' as 'APPROVED',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    for (const role of ['ADMIN', 'AGENT', 'FINANCE_ADMIN', 'PROCEDURE_STAFF', 'SEEKER']) {
      await expect(
        party.review({ userId: 'u', role, tenantId: 'ten_b', email: 'a@x' }, 'ten_b', 'sreq_1', {
          decision: 'APPROVED',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it('403s AGENT KYC approve even when the profile is missing', () => {
    const kyc = new KycController({ approveProfile: jest.fn() } as never);
    expect(() =>
      kyc.approveProfile({ userId: 'usr_agent', role: 'AGENT', tenantId: 'ten_b', email: 'a@x' }, 'USER', 'missing', {}),
    ).toThrow(ForbiddenException);
  });

  it('does not create an APPROVED KYC profile when none exists', async () => {
    const service = new KycService(
      { findOne: jest.fn(async () => null), save: jest.fn() } as never,
      { find: jest.fn() } as never,
      { append: jest.fn() } as never,
    );
    await expect(service.approveProfile('ten_b', 'USER', 'usr_x', 'usr_fin')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('moves DEPOSITED to CONTRACTED when SALES_DIRECTOR approves a complete roster', async () => {
    expect(canApproveContract('SALES_DIRECTOR')).toBe(true);
    const booking = { id: 'bk_1', tenantId: 'ten_b', status: 'DEPOSITED' };
    const request = {
      id: 'sreq_1',
      tenantId: 'ten_b',
      sourceEntityId: 'bk_1',
      requiresAdminReview: true,
      reviewDecision: null,
    };
    const parties = new SignaturePartyService(
      { findOne: jest.fn(async () => request), save: jest.fn(async (row: unknown) => row) } as never,
      { find: jest.fn(async () => [{ id: 's1', status: 'SIGNED' }]) } as never,
      {} as never,
      { findOne: jest.fn(async () => booking), save: jest.fn(async (row: { status: string }) => row) } as never,
      {} as never,
      { getRepository: () => ({ save: jest.fn(async (row: unknown) => row) }) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { get: () => undefined } as never,
    );
    const result = await parties.review('ten_b', 'sreq_1', { userId: 'usr_gdkd', role: 'SALES_DIRECTOR' }, 'APPROVED');
    expect(result.data.bookingStatus).toBe('CONTRACTED');
    expect(booking.status).toBe('CONTRACTED');

    booking.status = 'DEPOSITED';
    const unsigned = new SignaturePartyService(
      { findOne: jest.fn(async () => request), save: jest.fn(async (row: unknown) => row) } as never,
      { find: jest.fn(async () => [{ id: 's1', status: 'LINK_SENT' }]) } as never,
      {} as never,
      { findOne: jest.fn(async () => booking), save: jest.fn(async (row: { status: string }) => row) } as never,
      {} as never,
      { getRepository: () => ({ save: jest.fn(async (row: unknown) => row) }) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { get: () => undefined } as never,
    );
    const skipped = await unsigned.review('ten_b', 'sreq_1', { userId: 'usr_gdkd', role: 'SALES_DIRECTOR' }, 'APPROVED');
    expect(skipped.data.bookingStatus).toBeNull();
    expect(booking.status).toBe('DEPOSITED');
  });

  it('auto-advances CONTRACTED when review is not required and every signer has signed', () => {
    const signed = [{ id: 's1', signOrder: 1, groupId: null, status: 'SIGNED' }];
    expect(
      canAdvanceBookingToContracted({ requiresAdminReview: false, reviewDecision: null, roster: signed }),
    ).toBe(true);
    expect(
      canAdvanceBookingToContracted({ requiresAdminReview: true, reviewDecision: null, roster: signed }),
    ).toBe(false);
    expect(
      canAdvanceBookingToContracted({
        requiresAdminReview: true,
        reviewDecision: 'APPROVED',
        roster: signed,
      }),
    ).toBe(true);
    expect(
      canAdvanceBookingToContracted({
        requiresAdminReview: false,
        reviewDecision: null,
        roster: [{ id: 's1', signOrder: 1, groupId: null, status: 'LINK_SENT' }],
      }),
    ).toBe(false);
  });

  it('keeps D08 fail-closed', () => {
    const artifacts = new ContractArtifactService({} as never, {} as never);
    expect(() => artifacts.markProviderSigned('ca')).toThrow(UnprocessableEntityException);
    expect(() => artifacts.refuseExecuted()).toThrow(UnprocessableEntityException);
  });
});
