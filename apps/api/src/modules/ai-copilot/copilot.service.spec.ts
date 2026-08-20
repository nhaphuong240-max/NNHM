import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectEntity } from '../../database/entities/project.entity';
import { AuditService } from '../audit/audit.service';
import { GoldenRecordService } from '../golden-record/golden-record.service';
import { assertCopilotGuardrails } from './copilot.guardrails';
import { CopilotService } from './copilot.service';

describe('assertCopilotGuardrails', () => {
  it('blocks mutation keys in context', () => {
    expect(() => assertCopilotGuardrails({ basePrice: 1 })).toThrow(ForbiddenException);
  });

  it('allows benign context', () => {
    expect(() => assertCopilotGuardrails({ projectName: 'Sunrise' })).not.toThrow();
  });
});

describe('CopilotService', () => {
  let service: CopilotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopilotService,
        {
          provide: GoldenRecordService,
          useValue: {
            getUnit: jest.fn().mockResolvedValue({
              data: {
                attributes: {
                  code: 'A-12-05',
                  projectId: 'prj_sunrise',
                  bedrooms: 2,
                  area: 68,
                  floor: 12,
                  status: 'AVAILABLE',
                  basePrice: 3850000000,
                },
              },
            }),
          },
        },
        {
          provide: getRepositoryToken(ProjectEntity),
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              id: 'prj_sunrise',
              name: 'Sunrise Tower A',
            }),
          },
        },
        {
          provide: AuditService,
          useValue: { append: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get(CopilotService);
  });

  it('generates listing copilot with disclaimer and approval flag', async () => {
    const res = await service.generate('ten_dev_01', {
      unitId: 'un_01',
      task: 'LISTING_DESCRIPTION',
      tone: 'premium',
    });

    expect(res.data.attributes.requiresApproval).toBe(true);
    expect(res.data.attributes.disclaimer).toContain('agent duyệt');
    expect(res.data.attributes.title).toBeTruthy();
    expect(res.data.attributes.content.length).toBeGreaterThan(20);
    expect(res.data.attributes.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
