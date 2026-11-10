import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CrmRoutingRuleEntity } from '../../database/entities/crm-routing-rule.entity';
import { CrmRoutingSuggestionEntity } from '../../database/entities/crm-routing-suggestion.entity';
import { LeadScoringOutboxEntity } from '../../database/entities/lead-scoring-outbox.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { ViewingEntity } from '../../database/entities/viewing.entity';
import { AuditService } from '../audit/audit.service';
import { RoutingSuggestionService } from '../crm/routing-suggestion.service';
import { StreamEventsService } from '../stream/stream-events.service';
import { LeadHealthScoreService } from './lead-health-score.service';
import { LeadRoutingService } from './lead-routing.service';
import { LeadConversionService } from './lead-conversion.service';
import { LeadScoringService } from './lead-scoring.service';

describe('LeadScoringService', () => {
  let service: LeadScoringService;
  let suggestionsApi: RoutingSuggestionService;
  let leads: LeadEntity[];
  let outboxRows: LeadScoringOutboxEntity[];
  let suggestions: CrmRoutingSuggestionEntity[];

  const agent = {
    id: 'usr_agent_01',
    tenantId: 'ten_dev_01',
    role: 'AGENT',
    isActive: true,
    partnerScore: 80,
    skillTags: [],
    createdAt: new Date('2026-01-01'),
  } as unknown as UserEntity;

  beforeEach(async () => {
    leads = [];
    outboxRows = [];
    suggestions = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadScoringService,
        LeadRoutingService,
        RoutingSuggestionService,
        {
          provide: getRepositoryToken(LeadScoringOutboxEntity),
          useValue: {
            save: jest.fn(async (row: LeadScoringOutboxEntity) => {
              const saved = { ...row, createdAt: row.createdAt ?? new Date() };
              const idx = outboxRows.findIndex((r) => r.id === saved.id);
              if (idx >= 0) outboxRows[idx] = saved;
              else outboxRows.push(saved);
              return saved;
            }),
            find: jest.fn(async () => outboxRows.filter((r) => r.status === 'PENDING')),
            findOne: jest.fn(async (opts: { where: { id?: string; tenantId?: string; status?: string } }) => {
              const where = opts?.where ?? {};
              if (where.id) return outboxRows.find((r) => r.id === where.id) ?? null;
              if (where.status === 'PENDING' && where.tenantId) {
                return outboxRows.find((r) => r.tenantId === where.tenantId && r.status === 'PENDING') ?? null;
              }
              if (where.status === 'PROCESSED' && where.tenantId) {
                return (
                  [...outboxRows]
                    .reverse()
                    .find((r) => r.tenantId === where.tenantId && r.status === 'PROCESSED') ?? null
                );
              }
              return null;
            }),
            count: jest.fn(async ({ where }: { where?: { tenantId?: string; status?: string } }) =>
              outboxRows.filter(
                (r) =>
                  (!where?.tenantId || r.tenantId === where.tenantId) &&
                  (!where?.status || r.status === where.status),
              ).length,
            ),
          },
        },
        {
          provide: getRepositoryToken(LeadEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: { id?: string; tenantId?: string } }) =>
              leads.find((l) => l.id === where.id && l.tenantId === where.tenantId) ?? null,
            ),
            save: jest.fn(async (row: LeadEntity) => {
              const idx = leads.findIndex((l) => l.id === row.id);
              if (idx >= 0) leads[idx] = row;
              else leads.push(row);
              return row;
            }),
          },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            find: jest.fn(async () => [agent]),
            findOne: jest.fn(async ({ where }: { where?: { id?: string } }) =>
              where?.id && where.id !== agent.id ? null : agent,
            ),
            manager: { query: jest.fn(async () => []) },
          },
        },
        {
          provide: getRepositoryToken(CrmRoutingRuleEntity),
          useValue: {
            findOne: jest.fn(async () => null),
            save: jest.fn(async (row: CrmRoutingRuleEntity) => row),
          },
        },
        {
          provide: getRepositoryToken(CrmRoutingSuggestionEntity),
          useValue: {
            find: jest.fn(async () => suggestions.filter((row) => row.status === 'PENDING')),
            findOne: jest.fn(async ({ where }: { where?: Partial<CrmRoutingSuggestionEntity> }) =>
              suggestions.find(
                (row) =>
                  (!where?.id || row.id === where.id) &&
                  (!where?.tenantId || row.tenantId === where.tenantId) &&
                  (!where?.leadId || row.leadId === where.leadId) &&
                  (!where?.status || row.status === where.status),
              ) ?? null,
            ),
            save: jest.fn(async (row: CrmRoutingSuggestionEntity) => {
              const saved = { ...row, createdAt: row.createdAt ?? new Date() };
              const idx = suggestions.findIndex((item) => item.id === saved.id);
              if (idx >= 0) suggestions[idx] = saved;
              else suggestions.push(saved);
              return saved;
            }),
          },
        },
        {
          provide: getRepositoryToken(ListingEntity),
          useValue: { findOne: jest.fn(async () => null) },
        },
        {
          provide: getRepositoryToken(ViewingEntity),
          useValue: { find: jest.fn(async () => []) },
        },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        { provide: StreamEventsService, useValue: { publish: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: LeadConversionService,
          useValue: { record: jest.fn().mockResolvedValue({}), isHotLead: jest.fn(() => true) },
        },
        {
          provide: LeadHealthScoreService,
          useValue: { computeAndPersist: jest.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();

    service = module.get(LeadScoringService);
    suggestionsApi = module.get(RoutingSuggestionService);
  });

  function hotLead(id: string): LeadEntity {
    return {
      id,
      tenantId: 'ten_dev_01',
      fullName: 'Test',
      phone: '+84123456789',
      email: 'a@b.com',
      source: 'META_LEAD',
      score: 50,
      tier: 'NEW',
      scoreStatus: 'PENDING',
      status: 'NEW',
      routingStatus: 'PENDING',
      assignedTo: null,
      scoringMeta: null,
      unitId: 'un_01',
      listingId: null,
      message: null,
      idempotencyKey: null,
      consentGiven: false,
      consentAt: null,
      privacyPolicyVersion: null,
      marketingConsent: false,
      lostReason: null,
      lastActivityAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as LeadEntity;
  }

  it('scores HOT lead and keeps assignment pending human approval', async () => {
    leads.push(hotLead('ld_test'));

    await service.enqueue('ten_dev_01', 'ld_test', {
      source: 'META_LEAD',
      unitId: 'un_01',
      email: 'a@b.com',
    });

    expect(outboxRows[0].status).toBe('PROCESSED');
    expect(leads[0].tier).toBe('HOT');
    expect(leads[0].scoreStatus).toBe('SCORED');
    expect(leads[0].routingStatus).toBe('PENDING');
    expect(leads[0].assignedTo).toBeNull();
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].status).toBe('PENDING');
    expect(suggestions[0].suggestedAgentId).toBe('usr_agent_01');
    expect(suggestions[0].reason).toEqual(expect.objectContaining({ requiresHumanApproval: true }));
  });

  it('assigns the sale only after the routing suggestion is approved', async () => {
    leads.push(hotLead('ld_approve'));
    await service.enqueue('ten_dev_01', 'ld_approve', {
      source: 'META_LEAD',
      unitId: 'un_01',
      email: 'a@b.com',
    });
    expect(leads[0].routingStatus).toBe('PENDING');
    expect(leads[0].assignedTo).toBeNull();

    const approved = await suggestionsApi.approve('ten_dev_01', suggestions[0].id, 'usr_reviewer');

    expect(approved.data.status).toBe('APPROVED');
    expect(leads[0].routingStatus).toBe('ASSIGNED');
    expect(leads[0].assignedTo).toBe('usr_agent_01');
  });

  it('does not assign the sale when the suggestion is rejected or still pending', async () => {
    leads.push(hotLead('ld_reject'));
    await service.enqueue('ten_dev_01', 'ld_reject', {
      source: 'META_LEAD',
      unitId: 'un_01',
      email: 'a@b.com',
    });
    const pending = leads[0];
    expect(pending.routingStatus).toBe('PENDING');
    expect(pending.assignedTo).toBeNull();

    const rejected = await suggestionsApi.reject('ten_dev_01', suggestions[0].id, 'usr_reviewer');

    expect(rejected.data.status).toBe('REJECTED');
    expect(leads[0].routingStatus).toBe('PENDING');
    expect(leads[0].assignedTo).toBeNull();
  });

  it('explains stored lead score', async () => {
    leads.push({
      id: 'ld_explain',
      tenantId: 'ten_dev_01',
      fullName: 'Explain Lead',
      phone: '+84901234567',
      email: 'a@b.com',
      score: 85,
      tier: 'HOT',
      scoreStatus: 'SCORED',
      scoringMeta: {
        modelVersion: 'rules-v1-p2-2026',
        features: { source: 'META_LEAD', hasUnitInterest: true },
        unscored: false,
      },
    } as unknown as LeadEntity);

    const result = await service.explainLeadScore('ten_dev_01', 'ld_explain');
    expect(result.data.score).toBe(85);
    expect(result.data.factors.length).toBeGreaterThan(0);
    expect(result.meta.uc).toContain('UC-AI-02');
  });
});
