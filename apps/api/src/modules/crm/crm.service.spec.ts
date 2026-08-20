import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CrmActivityEntity } from '../../database/entities/crm-activity.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { AuditService } from '../audit/audit.service';
import { ConsentLedgerService } from '../compliance/consent-ledger.service';
import { LeadScoringService } from '../ai-scoring/lead-scoring.service';
import { LeadConversionService } from '../ai-scoring/lead-conversion.service';
import { StreamEventsService } from '../stream/stream-events.service';
import { MobileAgentService } from '../mobile-agent/mobile-agent.service';
import { CrmService } from './crm.service';

const TENANT = 'ten_dev_01';

describe('CrmService', () => {
  let service: CrmService;
  let rows: LeadEntity[];
  let activityRows: CrmActivityEntity[];

  beforeEach(async () => {
    rows = [];
    activityRows = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmService,
        {
          provide: getRepositoryToken(LeadEntity),
          useValue: {
            find: jest.fn(async () => rows),
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) =>
              rows.find(
                (r) =>
                  r.tenantId === where.tenantId &&
                  (where.idempotencyKey
                    ? r.idempotencyKey === where.idempotencyKey
                    : r.id === where.id),
              ) ?? null,
            ),
            save: jest.fn(async (row: LeadEntity) => {
              const idx = rows.findIndex((r) => r.id === row.id);
              const saved = {
                ...row,
                createdAt: row.createdAt ?? new Date(),
                updatedAt: new Date(),
              };
              if (idx >= 0) rows[idx] = saved;
              else rows.push(saved);
              return saved;
            }),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CrmActivityEntity),
          useValue: {
            save: jest.fn(async (row: CrmActivityEntity) => {
              const saved = { ...row, createdAt: row.createdAt ?? new Date() };
              activityRows.push(saved);
              return saved;
            }),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getMany: jest.fn(async () => activityRows),
            })),
          },
        },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        { provide: StreamEventsService, useValue: { publish: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: LeadScoringService,
          useValue: {
            enqueue: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConsentLedgerService,
          useValue: { record: jest.fn().mockResolvedValue({ data: { id: 'cns_test' } }) },
        },
        {
          provide: LeadConversionService,
          useValue: {
            record: jest.fn().mockResolvedValue({}),
            isHotLead: jest.fn(() => true),
          },
        },
        {
          provide: MobileAgentService,
          useValue: { notifyNewLead: jest.fn().mockResolvedValue({ data: { sent: 0 } }) },
        },
      ],
    }).compile();

    service = module.get(CrmService);
  });

  it('creates lead with provisional score and enqueues async scoring', async () => {
    const enqueue = jest.fn().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [
        CrmService,
        {
          provide: getRepositoryToken(LeadEntity),
          useValue: {
            find: jest.fn(async () => rows),
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) =>
              rows.find(
                (r) =>
                  r.tenantId === where.tenantId &&
                  (where.idempotencyKey
                    ? r.idempotencyKey === where.idempotencyKey
                    : r.id === where.id),
              ) ?? null,
            ),
            save: jest.fn(async (row: LeadEntity) => {
              const idx = rows.findIndex((r) => r.id === row.id);
              const saved = {
                ...row,
                createdAt: row.createdAt ?? new Date(),
                updatedAt: new Date(),
              };
              if (idx >= 0) rows[idx] = saved;
              else rows.push(saved);
              return saved;
            }),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CrmActivityEntity),
          useValue: {
            save: jest.fn(async (row: CrmActivityEntity) => {
              const saved = { ...row, createdAt: row.createdAt ?? new Date() };
              activityRows.push(saved);
              return saved;
            }),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getMany: jest.fn(async () => activityRows),
            })),
          },
        },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        { provide: StreamEventsService, useValue: { publish: jest.fn().mockResolvedValue(undefined) } },
        { provide: LeadScoringService, useValue: { enqueue } },
        {
          provide: ConsentLedgerService,
          useValue: { record: jest.fn().mockResolvedValue({ data: { id: 'cns_test' } }) },
        },
        {
          provide: LeadConversionService,
          useValue: {
            record: jest.fn().mockResolvedValue({}),
            isHotLead: jest.fn(() => true),
          },
        },
        {
          provide: MobileAgentService,
          useValue: { notifyNewLead: jest.fn().mockResolvedValue({ data: { sent: 0 } }) },
        },
      ],
    }).compile();
    const svc = module.get(CrmService);

    const result = await svc.createLead(TENANT, {
      fullName: 'Nguyễn Thu Trang',
      phone: '+84901234567',
      source: 'META_LEAD',
      unitId: 'un_01',
    });

    expect(result.data.id).toMatch(/^ld_/);
    expect(result.data.attributes.score).toBe(50);
    expect(result.data.attributes.tier).toBe('NEW');
    expect(result.data.attributes.scoreStatus).toBe('PENDING');
    expect(result.data.attributes.status).toBe('NEW');
    expect(result.data.attributes.routingStatus).toBe('PENDING');
    expect(enqueue).toHaveBeenCalledWith(
      TENANT,
      result.data.id,
      expect.objectContaining({ source: 'META_LEAD', unitId: 'un_01' }),
    );
  });

  it('persists utmCampaign and campaignId from UTM input (UC-AN-04)', async () => {
    const result = await service.createLead(TENANT, {
      fullName: 'Campaign Lead',
      phone: '+84909998888',
      source: 'PUBLIC_UNIT_DETAIL',
      unitId: 'un_01',
      consent: { privacyAccepted: true, privacyPolicyVersion: '2026-07-01' },
      utm: { utm_source: 'google', utm_campaign: 'q7_launch' },
      campaignId: 'camp_meta_01',
    });

    expect(result.data.attributes.utmCampaign).toBe('q7_launch');
    expect(result.data.attributes.campaignId).toBe('camp_meta_01');
    expect(rows[0].utmCampaign).toBe('q7_launch');
    expect(rows[0].campaignId).toBe('camp_meta_01');
  });

  it('requires PDPA consent for PUBLIC_FORM (BR-15)', async () => {
    await expect(
      service.createLead(TENANT, {
        fullName: 'Test',
        phone: '+84123456789',
        source: 'PUBLIC_FORM',
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    const ok = await service.createLead(TENANT, {
      fullName: 'Test',
      phone: '+84123456789',
      source: 'PUBLIC_FORM',
      unitId: 'un_01',
      consent: { privacyAccepted: true, privacyPolicyVersion: '2026-07-01' },
    });
    expect(ok.data.attributes.status).toBe('NEW');
    expect(rows[0].consentGiven).toBe(true);
    expect(rows[0].privacyPolicyVersion).toBe('2026-07-01');
  });

  it('imports leads from CSV preview and commit (UC-CRM-04)', async () => {
    const preview = await service.previewLeadImport(
      TENANT,
      { csvText: 'fullName,phone\nImport A,+84903334444\n,+84905556666' },
    );
    expect(preview.meta.validCount).toBe(1);
    expect(preview.meta.invalidCount).toBe(1);

    const commit = await service.commitLeadImport(TENANT, {
      rows: [{ fullName: 'Import A', phone: '+84903334444' }],
      defaultSource: 'CSV_IMPORT',
    });
    expect(commit.meta.createdCount).toBe(1);
    expect(rows.some((r) => r.phone === '+84903334444')).toBe(true);
  });

  it('requires privacyPolicyVersion when marketing consent (BR-15)', async () => {
    await expect(
      service.createLead(TENANT, {
        fullName: 'Test',
        phone: '+84123456789',
        consent: { marketing: true },
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('replays idempotent POST /leads', async () => {
    const key = 'lead-idem-01';
    const consent = { privacyAccepted: true, privacyPolicyVersion: '2026-07-01' };
    const first = await service.createLead(
      TENANT,
      { fullName: 'A', phone: '+84111111111', consent },
      key,
    );
    const second = await service.createLead(
      TENANT,
      { fullName: 'B', phone: '+84222222222', consent },
      key,
    );

    expect(second.data.id).toBe(first.data.id);
    expect(second.meta?.idempotentReplay).toBe(true);
    expect(rows).toHaveLength(1);
  });

  it('patches lead stage with audit', async () => {
    await service.createLead(TENANT, {
      fullName: 'Kanban',
      phone: '+84990000001',
      source: 'AGENT_REFERRAL',
    });
    const leadId = rows[0].id;

    const result = await service.patchLead(TENANT, leadId, { stage: 'CONTACTED' }, 'usr_agent_01');
    expect(result.data.attributes.status).toBe('CONTACTED');
  });

  it('rejects invalid stage transition', async () => {
    await service.createLead(TENANT, {
      fullName: 'Kanban',
      phone: '+84990000002',
      source: 'AGENT_REFERRAL',
    });
    const leadId = rows[0].id;

    await expect(
      service.patchLead(TENANT, leadId, { stage: 'WON' }, 'usr_agent_01'),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('requires lostReason for LOST stage', async () => {
    await service.createLead(TENANT, {
      fullName: 'Lost',
      phone: '+84990000003',
      source: 'AGENT_REFERRAL',
    });
    const leadId = rows[0].id;

    await expect(
      service.patchLead(TENANT, leadId, { stage: 'LOST' }, 'usr_agent_01'),
    ).rejects.toThrow(UnprocessableEntityException);

    const ok = await service.patchLead(
      TENANT,
      leadId,
      { stage: 'LOST', lostReason: 'NO_RESPONSE' },
      'usr_agent_01',
    );
    expect(ok.data.attributes.status).toBe('LOST');
    expect(ok.data.attributes.lostReason).toBe('NO_RESPONSE');
  });

  it('requires unitId when moving to BOOKING', async () => {
    await service.createLead(TENANT, {
      fullName: 'Booking',
      phone: '+84990000004',
      source: 'AGENT_REFERRAL',
    });
    const leadId = rows[0].id;
    await service.patchLead(TENANT, leadId, { stage: 'CONTACTED' });
    await service.patchLead(TENANT, leadId, { stage: 'VIEWING' });
    await service.patchLead(TENANT, leadId, { stage: 'NEGOTIATING' });

    await expect(
      service.patchLead(TENANT, leadId, { stage: 'BOOKING' }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('creates activity and updates lastActivityAt', async () => {
    await service.createLead(TENANT, {
      fullName: 'Activity',
      phone: '+84990000005',
      source: 'AGENT_REFERRAL',
    });
    const leadId = rows[0].id;

    const result = await service.createActivity(
      TENANT,
      { leadId, type: 'CALL', summary: 'Gọi lần 1' },
      'usr_agent_01',
    );

    expect(result.data.id).toMatch(/^act_/);
    expect(result.data.attributes.type).toBe('CALL');
    expect(rows[0].lastActivityAt).toBeTruthy();
  });

  it('404 when patching unknown lead', async () => {
    await expect(
      service.patchLead(TENANT, 'ld_missing', { stage: 'CONTACTED' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns lead by id', async () => {
    rows.push({
      id: 'ld_01',
      tenantId: TENANT,
      fullName: 'Nguyen Van A',
      phone: '0901234567',
      status: 'NEW',
      tier: 'WARM',
      score: 72,
      source: 'WEB',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as LeadEntity);

    const result = await service.getLead(TENANT, 'ld_01');
    expect(result.data.id).toBe('ld_01');
    expect(result.data.attributes.fullName).toBe('Nguyen Van A');
  });

  it('returns SLA task board (UC-CRM-06)', async () => {
    rows.push({
      id: 'ld_overdue',
      tenantId: TENANT,
      fullName: 'Overdue Lead',
      phone: '0901111222',
      status: 'CONTACTED',
      tier: 'HOT',
      score: 90,
      source: 'WEB',
      lastActivityAt: new Date(Date.now() - 50 * 60 * 60 * 1000),
      updatedAt: new Date(),
      createdAt: new Date(),
    } as LeadEntity);

    const result = await service.getSlaTasks(TENANT);
    expect(result.meta.screen).toBe('SCR-AGENT-SLA');
    expect(result.data.overdue.length).toBeGreaterThanOrEqual(1);
  });

  it('records SLA reminder activity', async () => {
    rows.push({
      id: 'ld_overdue',
      tenantId: TENANT,
      fullName: 'Overdue Lead',
      phone: '0901111222',
      status: 'NEW',
      tier: 'HOT',
      score: 90,
      source: 'WEB',
      lastActivityAt: new Date(Date.now() - 50 * 60 * 60 * 1000),
      updatedAt: new Date(),
      createdAt: new Date(),
    } as LeadEntity);

    const result = await service.recordSlaReminder(TENANT, 'ld_overdue', { channel: 'ZALO' });
    expect(result.meta.action).toBe('REMINDER');
    expect(activityRows.length).toBe(1);
  });
});
