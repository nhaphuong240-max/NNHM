import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ContractArtifactService } from './contract-artifact.service';
import {
  CONTRACTS_APPROVE_PERMISSION,
  KYC_APPROVE_PERMISSION,
  PERMISSION_MATRIX,
  canApproveContract,
  canApproveKyc,
} from '../identity/role-catalog';
import { KycController } from '../kyc/kyc.controller';
import { KycService } from '../kyc/kyc.service';
import { SignaturePartyController } from './signature-party.controller';
import { SignaturePartyService } from './signature-party.service';

describe('esign batch 4 approve and kyc', () => {
  it('assigns contracts.approve and kyc.approve to no role', () => {
    for (const role of Object.keys(PERMISSION_MATRIX)) {
      expect(PERMISSION_MATRIX[role as keyof typeof PERMISSION_MATRIX]).not.toContain(CONTRACTS_APPROVE_PERMISSION);
      expect(PERMISSION_MATRIX[role as keyof typeof PERMISSION_MATRIX]).not.toContain(KYC_APPROVE_PERMISSION);
    }
    expect(canApproveContract('PROCEDURE_STAFF')).toBe(false);
    expect(canApproveKyc('PROCEDURE_STAFF')).toBe(false);
    expect(canApproveContract('ADMIN')).toBe(false);
    expect(canApproveKyc('AGENT')).toBe(false);
  });

  it('returns 403 for every stock role on review and KYC approve', async () => {
    const party = new SignaturePartyController({} as never, {} as never);
    const kyc = new KycController({ approveProfile: jest.fn() } as never);
    for (const role of ['ADMIN', 'AGENT', 'FINANCE_ADMIN', 'PROCEDURE_STAFF', 'SEEKER']) {
      await expect(
        party.review({ userId: 'u', role, tenantId: 'ten_b', email: 'a@x' }, 'ten_b', 'sreq_1', {
          decision: 'APPROVED',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(() =>
        kyc.approveProfile({ userId: 'u', role, tenantId: 'ten_b', email: 'a@x' }, 'USER', 'usr_x', {}),
      ).toThrow(ForbiddenException);
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

  it('happy-path fixture only: temporary contracts.approve moves DEPOSITED to CONTRACTED', async () => {
    const granted = [...PERMISSION_MATRIX.FINANCE_ADMIN];
    PERMISSION_MATRIX.FINANCE_ADMIN.push(CONTRACTS_APPROVE_PERMISSION);
    try {
      expect(canApproveContract('FINANCE_ADMIN')).toBe(true);
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
      const result = await parties.review('ten_b', 'sreq_1', { userId: 'usr_fin', role: 'FINANCE_ADMIN' }, 'APPROVED');
      expect(result.data.bookingStatus).toBe('CONTRACTED');
      expect(booking.status).toBe('CONTRACTED');
    } finally {
      PERMISSION_MATRIX.FINANCE_ADMIN.splice(0, PERMISSION_MATRIX.FINANCE_ADMIN.length, ...granted);
    }
    expect(canApproveContract('FINANCE_ADMIN')).toBe(false);
  });

  it('keeps D08 fail-closed', () => {
    const artifacts = new ContractArtifactService({} as never, {} as never);
    expect(() => artifacts.markProviderSigned('ca')).toThrow(UnprocessableEntityException);
    expect(() => artifacts.refuseExecuted()).toThrow(UnprocessableEntityException);
  });
});
