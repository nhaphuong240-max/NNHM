import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ZaloLeadEventEntity } from '../../database/entities/zalo-lead-event.entity';
import { ZaloOaBindingEntity } from '../../database/entities/zalo-oa-binding.entity';
import { ZaloZnsDeliveryEntity } from '../../database/entities/zalo-zns-delivery.entity';
import { AuditService } from '../audit/audit.service';
import { CrmService } from '../crm/crm.service';
import { ZaloGraphClient } from './zalo-graph.client';
import { ZaloLeadService } from './zalo-lead.service';
import { ZaloTokenService } from './zalo-token.service';

const TENANT = 'ten_dev_01';

describe('ZaloLeadService', () => {
  let service: ZaloLeadService;
  let events: ZaloLeadEventEntity[];
  const createLead = jest.fn();
  const znsSave = jest.fn();

  beforeEach(async () => {
    events = [];
    createLead.mockReset();
    znsSave.mockReset();
    createLead.mockResolvedValue({
      data: {
        id: 'ld_zalo01',
        attributes: { tier: 'NEW', scoreStatus: 'PENDING' },
      },
      meta: {},
    });
    znsSave.mockImplementation(async (row: ZaloZnsDeliveryEntity) => row);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZaloLeadService,
        {
          provide: getRepositoryToken(ZaloLeadEventEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: { msgId?: string } }) =>
              events.find((e) => e.msgId === where.msgId) ?? null,
            ),
            find: jest.fn(async () => events),
            count: jest.fn(async () => events.length),
            save: jest.fn(async (row: ZaloLeadEventEntity) => {
              const idx = events.findIndex((e) => e.id === row.id || e.msgId === row.msgId);
              if (idx >= 0) events[idx] = row;
              else events.push(row);
              return row;
            }),
          },
        },
        {
          provide: getRepositoryToken(ZaloOaBindingEntity),
          useValue: {
            find: jest.fn(async () => [
              {
                id: 'zob_1',
                tenantId: TENANT,
                oaId: 'oa_sunrise_dev',
                oaName: 'Sunrise OA',
                isActive: true,
                accessToken: null,
                refreshToken: null,
                tokenExpiresAt: null,
              },
            ]),
            findOne: jest.fn(async ({ where }: { where: { oaId?: string; tenantId?: string } }) => ({
              id: 'zob_1',
              tenantId: where.tenantId ?? TENANT,
              oaId: where.oaId ?? 'oa_sunrise_dev',
              oaName: 'Sunrise OA',
              isActive: true,
              accessToken: null,
              refreshToken: null,
              tokenExpiresAt: null,
            })),
          },
        },
        {
          provide: getRepositoryToken(ZaloZnsDeliveryEntity),
          useValue: {
            find: jest.fn(async () => []),
            count: jest.fn(async () => 0),
            save: znsSave,
          },
        },
        { provide: CrmService, useValue: { createLead } },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              if (key === 'ZALO_WEBHOOK_SKIP_SIGNATURE') return 'true';
              if (key === 'ZALO_ZNS_SANDBOX') return 'true';
              if (key === 'ZALO_APP_ID') return 'zalo_app_dev';
              return fallback;
            }),
          },
        },
        {
          provide: ZaloGraphClient,
          useValue: {
            sendZnsTemplate: jest.fn(),
            buildTemplateData: jest.fn((_id: string, params: Record<string, unknown>) => params),
          },
        },
        {
          provide: ZaloTokenService,
          useValue: {
            isSandboxMode: jest.fn(async () => true),
            graphMode: jest.fn(async () => 'SANDBOX' as const),
          },
        },
      ],
    }).compile();

    service = module.get(ZaloLeadService);
  });

  it('creates CRM lead from Zalo webhook (AC-US-NW-01)', async () => {
    const result = await service.handleWebhook({
      app_id: 'zalo_app_dev',
      event_name: 'user_send_text',
      timestamp: '1234567890',
      oa_id: 'oa_sunrise_dev',
      sender: { id: 'user_abc' },
      recipient: { id: 'oa_sunrise_dev' },
      message: {
        msg_id: 'zmsg_tc01',
        text: 'Tên: Zalo Buyer\nSĐT: 0901234567',
      },
    });

    expect(result.processed).toBe(1);
    expect(createLead).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        source: 'ZALO_OA',
        fullName: 'Zalo Buyer',
        phone: '+84901234567',
      }),
      'zalo:zmsg_tc01',
    );
  });

  it('dedups replay by msg_id (BR-05)', async () => {
    events.push({
      id: 'zle_1',
      msgId: 'zmsg_dup',
      tenantId: TENANT,
      oaId: 'oa_sunrise_dev',
      status: 'PROCESSED',
      leadId: 'ld_existing',
      payload: {},
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ZaloLeadEventEntity);

    const result = await service.handleWebhook({
      event_name: 'user_send_text',
      oa_id: 'oa_sunrise_dev',
      sender: { id: 'user_x' },
      message: {
        msg_id: 'zmsg_dup',
        text: 'Tên: Dup\nSĐT: 0901111111',
      },
    });

    expect(result.result?.idempotentReplay).toBe(true);
    expect(createLead).not.toHaveBeenCalled();
  });

  it('records ZNS delivery in sandbox', async () => {
    const result = await service.sendZns(TENANT, {
      templateId: 'zns_lead_ack_v1',
      phone: '+84901234567',
    });

    expect(result.status).toBe('SENT');
    expect(result.sandbox).toBe(true);
    expect(znsSave).toHaveBeenCalled();
  });
});
