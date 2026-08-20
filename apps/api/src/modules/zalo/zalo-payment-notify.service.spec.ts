import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { ZALO_ZNS_TEMPLATES } from './zalo.types';
import { ZaloLeadService } from './zalo-lead.service';
import { ZaloPaymentNotifyService } from './zalo-payment-notify.service';

const TENANT = 'ten_dev_01';

describe('ZaloPaymentNotifyService', () => {
  let service: ZaloPaymentNotifyService;
  const sendZns = jest.fn();

  beforeEach(async () => {
    sendZns.mockReset();
    sendZns.mockResolvedValue({
      deliveryId: 'zns_pay01',
      status: 'SENT',
      providerRef: 'sandbox_zns_pay01',
      sandbox: true,
      idempotentReplay: false,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZaloPaymentNotifyService,
        {
          provide: getRepositoryToken(BookingEntity),
          useValue: {
            findOne: jest.fn(async () => ({
              id: 'bk_test01',
              tenantId: TENANT,
              unitId: 'un_01',
              leadId: 'ld_01',
            })),
          },
        },
        {
          provide: getRepositoryToken(LeadEntity),
          useValue: {
            findOne: jest.fn(async () => ({
              id: 'ld_01',
              tenantId: TENANT,
              fullName: 'Nguyễn A',
              phone: '+84987654321',
            })),
          },
        },
        {
          provide: getRepositoryToken(UnitEntity),
          useValue: {
            findOne: jest.fn(async () => ({
              id: 'un_01',
              tenantId: TENANT,
              code: 'A-12-05',
            })),
          },
        },
        { provide: ZaloLeadService, useValue: { sendZns } },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              if (key === 'ZALO_PAYMENT_ZNS_ENABLED') return 'true';
              return fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ZaloPaymentNotifyService);
  });

  it('sends booking confirm ZNS on payment success (AC-US-NW-02)', async () => {
    const result = await service.notifyPaymentSuccess({
      tenantId: TENANT,
      paymentIntentId: 'pi_test01',
      bookingId: 'bk_test01',
      amount: 50_000_000,
      transactionId: 'MOCK_TXN_01',
      webhookEventId: 'evt_test_01',
    });

    expect(result.sent).toBe(true);
    expect(result.deliveryId).toBe('zns_pay01');
    expect(sendZns).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        templateId: ZALO_ZNS_TEMPLATES.BOOKING_CONFIRM,
        phone: '+84987654321',
        source: { type: 'PAYMENT_SUCCESS', id: 'pi_test01' },
      }),
    );
  });
});
