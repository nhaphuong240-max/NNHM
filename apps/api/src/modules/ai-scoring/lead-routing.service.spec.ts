import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { LeadEntity } from '../../database/entities/lead.entity';
import { CrmRoutingRuleEntity } from '../../database/entities/crm-routing-rule.entity';
import { CrmRoutingSuggestionEntity } from '../../database/entities/crm-routing-suggestion.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { LeadConversionService } from './lead-conversion.service';
import { LeadRoutingService } from './lead-routing.service';

describe('LeadRoutingService', () => {
  let service: LeadRoutingService;
  let agents: UserEntity[];
  let routingRulesFindOne: jest.Mock;
  let suggestionsSave: jest.Mock;

  const conversion = {
    record: jest.fn(async () => ({})),
  };

  const audit = {
    append: jest.fn(async () => undefined),
  };

  beforeEach(async () => {
    routingRulesFindOne = jest.fn(async () => null);
    suggestionsSave = jest.fn(async (row) => row);

    agents = [
      {
        id: 'usr_agent_01',
        tenantId: 'ten_dev_01',
        role: 'AGENT',
        isActive: true,
        partnerScore: 70,
        createdAt: new Date('2026-01-01'),
      } as UserEntity,
      {
        id: 'usr_agent_02',
        tenantId: 'ten_dev_01',
        role: 'AGENT',
        isActive: true,
        partnerScore: 65,
        createdAt: new Date('2026-01-02'),
      } as UserEntity,
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadRoutingService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            find: jest.fn(async () => agents),
            findOne: jest.fn(async () => agents[0]),
          },
        },
        {
          provide: getRepositoryToken(CrmRoutingRuleEntity),
          useValue: { findOne: routingRulesFindOne, save: jest.fn() },
        },
        {
          provide: getRepositoryToken(CrmRoutingSuggestionEntity),
          useValue: { findOne: jest.fn(async () => null), save: suggestionsSave },
        },
        {
          provide: getRepositoryToken(ListingEntity),
          useValue: { findOne: jest.fn(async () => null) },
        },
        { provide: AuditService, useValue: audit },
        { provide: LeadConversionService, useValue: conversion },
      ],
    }).compile();

    service = module.get(LeadRoutingService);
    jest.clearAllMocks();
  });

  it('leaves non-HOT leads unassigned', async () => {
    const lead = {
      id: 'ld_01',
      tier: 'WARM',
      score: 70,
      routingStatus: 'PENDING',
      assignedTo: null,
    } as LeadEntity;

    const result = await service.applyRouting('ten_dev_01', lead);
    expect(result.routingStatus).toBe('PENDING');
    expect(result.assignedTo).toBeNull();
    expect(conversion.record).not.toHaveBeenCalled();
  });

  it('creates routing suggestion when human approval required (P2)', async () => {
    const hot = {
      id: 'ld_hot_p2',
      tier: 'HOT',
      score: 90,
      routingStatus: 'PENDING',
      assignedTo: null,
    } as LeadEntity;

    const result = await service.applyRouting('ten_dev_01', hot);
    expect(result.routingStatus).toBe('PENDING');
    expect(result.assignedTo).toBeNull();
    expect(suggestionsSave).toHaveBeenCalled();
    expect(conversion.record).not.toHaveBeenCalled();
  });

  it('assigns HOT leads round-robin when approval disabled', async () => {
    routingRulesFindOne.mockResolvedValue({
      tenantId: 'ten_dev_01',
      projectId: '',
      rules: { enabled: true, requireHumanApproval: false, roundRobinCursor: 0 },
    });

    const hot = {
      id: 'ld_hot_01',
      tier: 'HOT',
      score: 90,
      routingStatus: 'PENDING',
      assignedTo: null,
    } as LeadEntity;

    const first = await service.applyRouting('ten_dev_01', hot);
    expect(first.routingStatus).toBe('ASSIGNED');
    expect(first.assignedTo).toBe('usr_agent_01');
    expect(conversion.record).toHaveBeenCalledWith(
      'ten_dev_01',
      'ld_hot_01',
      'HOT_ROUTED',
      expect.objectContaining({ assignedTo: 'usr_agent_01' }),
    );

    const second = await service.applyRouting('ten_dev_01', {
      ...hot,
      id: 'ld_hot_02',
    });
    expect(second.assignedTo).toBe('usr_agent_02');
  });

  it('falls back to default agent when pool empty', async () => {
    routingRulesFindOne.mockResolvedValue({
      tenantId: 'ten_dev_01',
      projectId: '',
      rules: { enabled: true, requireHumanApproval: false, roundRobinCursor: 0 },
    });
    agents.length = 0;
    const lead = {
      id: 'ld_hot_03',
      tier: 'HOT',
      score: 88,
      routingStatus: 'PENDING',
      assignedTo: null,
    } as LeadEntity;

    const result = await service.applyRouting('ten_dev_01', lead);
    expect(result.assignedTo).toBe('usr_agent_01');
  });
});
