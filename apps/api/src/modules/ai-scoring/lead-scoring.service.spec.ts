import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeadScoringOutboxEntity } from '../../database/entities/lead-scoring-outbox.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { StreamEventsService } from '../stream/stream-events.service';
import { LeadRoutingService } from './lead-routing.service';
import { LeadConversionService } from './lead-conversion.service';
import { LeadScoringService } from './lead-scoring.service';

describe('LeadScoringService', () => {
  let service: LeadScoringService;
  let leads: LeadEntity[];
  let outboxRows: LeadScoringOutboxEntity[];

  beforeEach(async () => {
    leads = [];
    outboxRows = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadScoringService,
        LeadRoutingService,
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
            find: jest.fn(async () => [{ id: 'usr_agent_01', tenantId: 'ten_dev_01', role: 'AGENT' }]),
          },
        },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        { provide: StreamEventsService, useValue: { publish: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: LeadConversionService,
          useValue: { record: jest.fn().mockResolvedValue({}), isHotLead: jest.fn(() => true) },
        },
      ],
    }).compile();

    service = module.get(LeadScoringService);
  });

  it('scores HOT lead and assigns agent', async () => {
    leads.push({
      id: 'ld_test',
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
    } as LeadEntity);

    await service.enqueue('ten_dev_01', 'ld_test', {
      source: 'META_LEAD',
      unitId: 'un_01',
      email: 'a@b.com',
    });

    expect(outboxRows[0].status).toBe('PROCESSED');
    expect(leads[0].tier).toBe('HOT');
    expect(leads[0].scoreStatus).toBe('SCORED');
    expect(leads[0].routingStatus).toBe('ASSIGNED');
    expect(leads[0].assignedTo).toBe('usr_agent_01');
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
