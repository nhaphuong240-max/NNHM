import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AiLeadCopilotDraftEntity } from '../../database/entities/ai-lead-copilot-draft.entity';
import { CrmActivityEntity } from '../../database/entities/crm-activity.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { ViewingEntity } from '../../database/entities/viewing.entity';
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
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
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
        { provide: getRepositoryToken(LeadEntity), useValue: { findOne: jest.fn().mockResolvedValue(null) } },
        { provide: getRepositoryToken(ViewingEntity), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: getRepositoryToken(CrmActivityEntity), useValue: { find: jest.fn().mockResolvedValue([]) } },
        {
          provide: getRepositoryToken(AiLeadCopilotDraftEntity),
          useValue: { save: jest.fn().mockResolvedValue({}) },
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
    expect(res.data.attributes.content.toLowerCase()).not.toContain('giá');
    expect(res.data.attributes.citations).toEqual(['unit:un_01', 'project:prj_sunrise']);
  });

  it('answers không đủ dữ liệu when the project row has no name', async () => {
    const projects = module.get(getRepositoryToken(ProjectEntity));
    (projects.findOne as jest.Mock).mockResolvedValueOnce(null);
    const res = await service.generate('ten_dev_01', {
      unitId: 'un_01',
      task: 'LISTING_DESCRIPTION',
      context: { projectName: 'Tên do client gửi' },
    });
    expect(res.data.attributes.content).toBe('không đủ dữ liệu');
    expect(res.data.attributes.title).toBe('không đủ dữ liệu');
    expect(res.data.attributes.citations).toBeUndefined();
  });
});
