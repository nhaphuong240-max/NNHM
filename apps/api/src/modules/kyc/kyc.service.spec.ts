import { UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KycProfileEntity } from '../../database/entities/kyc-profile.entity';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import { KycService } from './kyc.service';

const TENANT = 'ten_dev_01';

describe('KycService', () => {
  let service: KycService;
  let profiles: KycProfileEntity[];

  beforeEach(async () => {
    profiles = [
      {
        id: 'kyc_agent',
        tenantId: TENANT,
        subjectType: 'USER',
        subjectId: 'usr_agent_01',
        status: 'APPROVED',
        verifiedAt: new Date(),
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as KycProfileEntity,
      {
        id: 'kyc_agency',
        tenantId: TENANT,
        subjectType: 'AGENCY',
        subjectId: 'agcy_sunrise',
        status: 'PENDING',
        verifiedAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as KycProfileEntity,
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        {
          provide: getRepositoryToken(KycProfileEntity),
          useValue: {
            find: jest.fn(async () => profiles),
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) =>
              profiles.find(
                (p) =>
                  p.tenantId === where.tenantId &&
                  p.subjectType === where.subjectType &&
                  p.subjectId === where.subjectId,
              ) ?? null,
            ),
            save: jest.fn(async (row: KycProfileEntity) => {
              const idx = profiles.findIndex((p) => p.id === row.id);
              if (idx >= 0) profiles[idx] = row;
              else profiles.push(row);
              return row;
            }),
          },
        },
        {
          provide: getRepositoryToken(AuditEventEntity),
          useValue: { find: jest.fn(async () => []), findOne: jest.fn(async () => null) },
        },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    service = module.get(KycService);
  });

  it('blocks payout when KYC not approved (BR-23)', async () => {
    await expect(
      service.assertEntriesPayoutEligible(TENANT, [
        {
          id: 'ce_a',
          recipientType: 'AGENT',
          recipientId: 'usr_agent_01',
        } as never,
        {
          id: 'ce_b',
          recipientType: 'AGENCY',
          recipientId: 'agcy_sunrise',
        } as never,
      ]),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('allows payout when all recipients KYC approved', async () => {
    profiles[1].status = 'APPROVED';
    await expect(
      service.assertEntriesPayoutEligible(TENANT, [
        {
          id: 'ce_a',
          recipientType: 'AGENT',
          recipientId: 'usr_agent_01',
        } as never,
        {
          id: 'ce_b',
          recipientType: 'AGENCY',
          recipientId: 'agcy_sunrise',
        } as never,
      ]),
    ).resolves.toBeUndefined();
  });
});
