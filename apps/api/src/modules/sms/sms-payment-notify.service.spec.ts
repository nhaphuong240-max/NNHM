import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { SmsPaymentNotifyService } from './sms-payment-notify.service';
import { SmsService } from './sms.service';

const TENANT = 'ten_dev_01';

describe('SmsPaymentNotifyService', () => {
  let service: SmsPaymentNotifyService;
  const sendSms = jest.fn();

  beforeEach(async () => {
    sendSms.mockReset();
    sendSms.mockResolvedValue({
      deliveryId: 'sms_abc123',
      status: 'SENT',
      sandbox: true,
      otp: '123456',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsPaymentNotifyService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_k: string, fb?: unknown) => fb ?? 'true') },
        },
        {
          provide: getRepositoryToken(BookingEntity),
          useValue: {
            findOne: jest.fn(async () => ({
              id: 'bk_test01',
              tenantId: TENANT,
              unitId: 'un_01',
              leadId: 'ld_04',
            })),
          },
        },
        {
          provide: getRepositoryToken(LeadEntity),
          useValue: {
            findOne: jest.fn(async () => ({
              id: 'ld_04',
              phone: '+84955667788',
              fullName: 'Phạm C',
            })),
          },
        },
        { provide: getRepositoryToken(UnitEntity), useValue: { findOne: jest.fn() } },
        { provide: SmsService, useValue: { sendSms } },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    service = module.get(SmsPaymentNotifyService);
  });

  it('sends payment OTP SMS on intent create hook', async () => {
    const result = await service.sendPaymentOtp({
      tenantId: TENANT,
      paymentIntentId: 'pi_test01',
      bookingId: 'bk_test01',
      amount: 50_000_000,
    });

    expect(result.sent).toBe(true);
    expect(result.otp).toBe('123456');
    expect(sendSms).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({ source: { type: 'PAYMENT_OTP', id: 'pi_test01' } }),
    );
  });
});
