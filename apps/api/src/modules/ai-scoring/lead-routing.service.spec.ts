import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { LeadEntity } from '../../database/entities/lead.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { LeadConversionService } from './lead-conversion.service';
import { LeadRoutingService } from './lead-routing.service';

describe('LeadRoutingService', () => {
  let service: LeadRoutingService;
  let agents: UserEntity[];

  const conversion = {
    record: jest.fn(async () => ({})),
  };

  const audit = {
    append: jest.fn(async () => undefined),
  };

  beforeEach(async () => {
    agents = [
      {
        id: 'usr_agent_01',
        tenantId: 'ten_dev_01',
        role: 'AGENT',
        isActive: true,
        createdAt: new Date('2026-01-01'),
      } as UserEntity,
      {
        id: 'usr_agent_02',
        tenantId: 'ten_dev_01',
        role: 'AGENT',
        isActive: true,
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
          },
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

  it('assigns HOT leads round-robin and records conversion event', async () => {
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
