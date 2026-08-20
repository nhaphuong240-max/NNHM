import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { MetaLeadEventEntity } from '../../database/entities/meta-lead-event.entity';
import { MetaPageBindingEntity } from '../../database/entities/meta-page-binding.entity';
import { AuditService } from '../audit/audit.service';
import { CrmService } from '../crm/crm.service';
import { MetaLeadService } from './meta-lead.service';
import { MetaGraphClient } from './meta-graph.client';

const TENANT = 'ten_dev_01';

describe('MetaLeadService', () => {
  let service: MetaLeadService;
  let graph: MetaGraphClient;
  let events: MetaLeadEventEntity[];
  const createLead = jest.fn();

  beforeEach(async () => {
    events = [];
    createLead.mockReset();
    createLead.mockResolvedValue({
      data: {
        id: 'ld_meta01',
        attributes: { tier: 'NEW', scoreStatus: 'PENDING' },
      },
      meta: {},
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaLeadService,
        {
          provide: getRepositoryToken(MetaLeadEventEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: { leadgenId?: string } }) =>
              events.find((e) => e.leadgenId === where.leadgenId) ?? null,
            ),
            find: jest.fn(async () => events),
            count: jest.fn(async () => events.length),
            save: jest.fn(async (row: MetaLeadEventEntity) => {
              const idx = events.findIndex((e) => e.id === row.id || e.leadgenId === row.leadgenId);
              if (idx >= 0) events[idx] = row;
              else events.push(row);
              return row;
            }),
          },
        },
        {
          provide: getRepositoryToken(MetaPageBindingEntity),
          useValue: {
            find: jest.fn(async () => [
              {
                id: 'mpb_1',
                tenantId: TENANT,
                pageId: 'page_sunrise_dev',
                pageName: 'Sunrise',
                isActive: true,
              },
            ]),
            findOne: jest.fn(async ({ where }: { where: { pageId?: string; tenantId?: string } }) => ({
              id: 'mpb_1',
              tenantId: where.tenantId ?? TENANT,
              pageId: where.pageId ?? 'page_sunrise_dev',
              pageName: 'Sunrise',
              pageAccessToken: 'page_token_dev',
              isActive: true,
            })),
          },
        },
        { provide: CrmService, useValue: { createLead } },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        {
          provide: MetaGraphClient,
          useValue: {
            fetchLead: jest.fn().mockResolvedValue({
              field_data: [
                { name: 'full_name', values: ['Graph Lead'] },
                { name: 'phone_number', values: ['0909999888'] },
              ],
            }),
            isLiveMode: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              if (key === 'META_VERIFY_TOKEN') return 'wereal-meta-verify-dev';
              if (key === 'META_WEBHOOK_SKIP_SIGNATURE') return 'true';
              return fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(MetaLeadService);
    graph = module.get(MetaGraphClient);
  });

  it('verifies Meta webhook subscription', () => {
    expect(
      service.verifySubscription('subscribe', 'wereal-meta-verify-dev', 'challenge_123'),
    ).toBe('challenge_123');
  });

  it('creates CRM lead from Meta webhook (TC-21)', async () => {
    const result = await service.handleWebhook({
      object: 'page',
      entry: [
        {
          id: 'page_sunrise_dev',
          time: Date.now(),
          changes: [
            {
              field: 'leadgen',
              value: {
                leadgen_id: 'lg_tc21_01',
                page_id: 'page_sunrise_dev',
                campaign_id: 'camp_july',
                ad_id: 'ad_01',
                field_data: [
                  { name: 'full_name', values: ['Meta Buyer'] },
                  { name: 'phone_number', values: ['0901234567'] },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(result.processed).toBe(1);
    expect(createLead).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        source: 'META_LEAD',
        fullName: 'Meta Buyer',
        phone: '+84901234567',
      }),
      'meta:lg_tc21_01',
    );
  });

  it('dedups replay by leadgen_id (BR-05)', async () => {
    events.push({
      id: 'mle_1',
      leadgenId: 'lg_dup',
      tenantId: TENANT,
      pageId: 'page_sunrise_dev',
      status: 'PROCESSED',
      leadId: 'ld_existing',
      payload: {},
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as MetaLeadEventEntity);

    const result = await service.handleWebhook({
      object: 'page',
      entry: [
        {
          id: 'page_sunrise_dev',
          time: Date.now(),
          changes: [
            {
              field: 'leadgen',
              value: {
                leadgen_id: 'lg_dup',
                page_id: 'page_sunrise_dev',
                field_data: [
                  { name: 'full_name', values: ['Dup'] },
                  { name: 'phone_number', values: ['0901111111'] },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(result.results?.[0]?.idempotentReplay).toBe(true);
    expect(createLead).not.toHaveBeenCalled();
  });

  it('fetches field_data via Graph when webhook omits payload (Phase 2)', async () => {
    const fetchLead = jest.spyOn(graph, 'fetchLead');

    await service.handleWebhook({
      object: 'page',
      entry: [
        {
          id: 'page_sunrise_dev',
          time: Date.now(),
          changes: [
            {
              field: 'leadgen',
              value: {
                leadgen_id: 'lg_graph_01',
                page_id: 'page_sunrise_dev',
              },
            },
          ],
        },
      ],
    });

    expect(fetchLead).toHaveBeenCalledWith('lg_graph_01', expect.any(String));
    expect(createLead).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({ fullName: 'Graph Lead' }),
      'meta:lg_graph_01',
    );
  });
});
