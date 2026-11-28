import { UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SmsBindingEntity } from '../../database/entities/sms-binding.entity';
import { SmsDeliveryEntity } from '../../database/entities/sms-delivery.entity';
import { AuditService } from '../audit/audit.service';
import { RailResolverService } from '../tenant-config/rail-resolver.service';
import { SmsProviderClient } from './sms-provider.client';
import { SmsService } from './sms.service';
import { SMS_TEMPLATES } from './sms.types';

const TENANT = 'ten_dev_01';

describe('SmsService', () => {
  let service: SmsService;
  let deliveries: SmsDeliveryEntity[];
  let railsResolve: jest.Mock;

  beforeEach(async () => {
    deliveries = [];
    railsResolve = jest.fn(async () => ({ smsSandbox: true, znsSandbox: true, pushLiveEnabled: false }));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        SmsProviderClient,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_k: string, fb?: unknown) => fb ?? 'true') },
        },
        {
          provide: getRepositoryToken(SmsDeliveryEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) =>
              deliveries.find(
                (d) =>
                  d.tenantId === where.tenantId &&
                  (where.id
                    ? d.id === where.id
                    : d.sourceType === where.sourceType && d.sourceId === where.sourceId),
              ) ?? null,
            ),
            find: jest.fn(async () => deliveries),
            count: jest.fn(async () => deliveries.length),
            save: jest.fn(async (row: SmsDeliveryEntity) => {
              const saved = {
                ...row,
                createdAt: row.createdAt ?? new Date(),
                updatedAt: new Date(),
              };
              deliveries.push(saved);
              return saved;
            }),
          },
        },
        {
          provide: getRepositoryToken(SmsBindingEntity),
          useValue: {
            find: jest.fn(async () => [
              {
                id: 'smb_01',
                tenantId: TENANT,
                provider: 'SANDBOX',
                brandName: 'Sunrise',
                senderId: 'WEREAL',
                isActive: true,
              },
            ]),
            findOne: jest.fn(async () => ({
              id: 'smb_01',
              tenantId: TENANT,
              provider: 'SANDBOX',
              brandName: 'Sunrise',
              isActive: true,
            })),
          },
        },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        {
          provide: RailResolverService,
          useValue: {
            resolve: railsResolve,
          },
        },
      ],
    }).compile();

    service = module.get(SmsService);
  });

  it('returns integration status', async () => {
    const result = await service.getIntegrationStatus(TENANT);
    expect(result.data.channel).toBe('SMS');
    expect(result.data.graphMode).toBe('SANDBOX');
  });

  it('sends sandbox OTP with idempotency', async () => {
    const first = await service.sendSms(TENANT, {
      templateId: SMS_TEMPLATES.OTP,
      phone: '+84901234567',
      source: { type: 'PAYMENT_OTP', id: 'pi_test01' },
    });
    expect(first.otp).toBe('123456');
    expect(first.sandbox).toBe(true);

    const replay = await service.sendSms(TENANT, {
      templateId: SMS_TEMPLATES.OTP,
      phone: '+84901234567',
      source: { type: 'PAYMENT_OTP', id: 'pi_test01' },
    });
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.deliveryId).toBe(first.deliveryId);
  });

  it('stores an e-sign delivery without the otp when persistOtp is false', async () => {
    const sent = await service.sendSms(TENANT, {
      templateId: SMS_TEMPLATES.OTP,
      phone: '+84901234567',
      persistOtp: false,
      source: { type: 'ESIGN_OTP', id: 'ctr_demo:jti_demo' },
    });
    expect(sent.otp).toEqual(expect.any(String));
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]?.params).not.toHaveProperty('otp');
    expect(JSON.stringify(deliveries[0]?.params)).not.toContain(String(sent.otp));
  });

  it('rejects demo OTP 123456 when tenant smsSandbox=false (OPS-S4-04)', async () => {
    railsResolve.mockResolvedValueOnce({ smsSandbox: false });
    await expect(service.assertNotDemoOtp(TENANT, '123456')).rejects.toThrow();
  });

  it('lets payment OTP send when SMS_SANDBOX is empty', async () => {
    (service as unknown as { config: { get: jest.Mock } }).config.get.mockImplementation(() => '');
    const sent = await service.sendSms(TENANT, {
      templateId: SMS_TEMPLATES.OTP,
      phone: '+84901234567',
      source: { type: 'PAYMENT_OTP', id: 'pi_empty_sandbox' },
    });
    expect(sent.status).toBeDefined();
    expect(sent.sandbox).toBe(true);
  });

  it('refuses e-sign send when SMS_SANDBOX is empty', async () => {
    (service as unknown as { config: { get: jest.Mock } }).config.get.mockImplementation(() => '');
    await expect(service.assertEsignReady(TENANT)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
