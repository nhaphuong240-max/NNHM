import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import { TenantConfigService } from '../tenant-config/tenant-config.service';
import { TenantWebhookRetryService } from './tenant-webhook-retry.service';
import { TenantWebhookService } from './tenant-webhook.service';

const TENANT = 'ten_dev_01';

describe('TenantWebhookService', () => {
  let service: TenantWebhookService;
  const append = jest.fn().mockResolvedValue({});
  const enqueue = jest.fn().mockResolvedValue({ nextRetryAt: new Date().toISOString() });

  beforeEach(async () => {
    append.mockClear();
    enqueue.mockClear();
    global.fetch = jest.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantWebhookService,
        {
          provide: getRepositoryToken(AuditEventEntity),
          useValue: {
            find: jest.fn(async () => [
              {
                payload: {
                  subscription: {
                    id: 'whk_demo',
                    label: 'ERP hook',
                    targetUrl: 'https://hooks.example/wereal',
                    events: ['booking.created', 'payment.success'],
                    enabled: true,
                    secretPrefix: 'whsec_demo****',
                    createdAt: new Date().toISOString(),
                  },
                  secret: 'whsec_demo_secret',
                },
              },
            ]),
            findOne: jest.fn(async () => null),
          },
        },
        { provide: AuditService, useValue: { append } },
        { provide: TenantWebhookRetryService, useValue: { enqueue } },
        {
          provide: TenantConfigService,
          useValue: {
            loadWebhookSubscriptions: jest.fn(async () => [
              {
                id: 'whk_demo',
                label: 'ERP hook',
                targetUrl: 'https://hooks.example/wereal',
                events: ['booking.created', 'payment.success'],
                enabled: true,
                secretPrefix: 'whsec_demo****',
                createdAt: new Date().toISOString(),
              },
            ]),
            saveWebhookSubscriptions: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(TenantWebhookService);
  });

  it('emitEvent delivers HTTP to enabled subscriptions (UC-NW-05)', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200 })) as unknown as typeof fetch;
    const result = await service.emitEvent(TENANT, 'booking.created', { bookingId: 'bk_01' });
    expect(result.data.delivered).toBe(1);
    expect(global.fetch).toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELIVER', entityType: 'tenant_webhook_delivery' }),
    );
  });

  it('enqueue retry when live delivery fails', async () => {
    const result = await service.emitEvent(TENANT, 'booking.created', { bookingId: 'bk_01' });
    expect(result.data.delivered).toBe(0);
    expect(enqueue).toHaveBeenCalled();
  });
});
