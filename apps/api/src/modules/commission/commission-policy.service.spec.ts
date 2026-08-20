import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommissionPolicyEntity } from '../../database/entities/commission-policy.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { AuditService } from '../audit/audit.service';
import { CommissionPolicyService } from './commission-policy.service';

const TENANT = 'ten_dev_01';

describe('CommissionPolicyService', () => {
  let service: CommissionPolicyService;
  let policies: CommissionPolicyEntity[];
  let projects: ProjectEntity[];

  beforeEach(async () => {
    policies = [];
    projects = [
      {
        id: 'prj_sunrise',
        tenantId: TENANT,
        code: 'SUNRISE',
        name: 'Sunrise Tower',
        createdAt: new Date(),
      },
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionPolicyService,
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        {
          provide: getRepositoryToken(ProjectEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
              projects.find((p) => p.id === where.id && p.tenantId === where.tenantId) ?? null,
            ),
          },
        },
        {
          provide: getRepositoryToken(CommissionPolicyEntity),
          useValue: {
            find: jest.fn(async ({ where, order, take }: { where: Record<string, string>; order?: Record<string, string>; take?: number }) => {
              let rows = policies.filter((p) => {
                if (where.tenantId && p.tenantId !== where.tenantId) return false;
                if (where.projectId && p.projectId !== where.projectId) return false;
                if (where.status && p.status !== where.status) return false;
                if (where.id && p.id !== where.id) return false;
                return true;
              });
              if (order?.version === 'DESC') rows = [...rows].sort((a, b) => b.version - a.version);
              if (take) rows = rows.slice(0, take);
              return rows;
            }),
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) => {
              const rows = policies.filter((p) => {
                if (where.tenantId && p.tenantId !== where.tenantId) return false;
                if (where.projectId && p.projectId !== where.projectId) return false;
                if (where.status && p.status !== where.status) return false;
                if (where.id && p.id !== where.id) return false;
                return true;
              });
              return rows[0] ?? null;
            }),
            save: jest.fn(async (row: CommissionPolicyEntity) => {
              const saved = {
                ...row,
                createdAt: row.createdAt ?? new Date(),
                updatedAt: new Date(),
              };
              const idx = policies.findIndex((p) => p.id === saved.id);
              if (idx >= 0) policies[idx] = saved;
              else policies.push(saved);
              return saved;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(CommissionPolicyService);
  });

  it('creates draft policy and publishes immutable version (S5-01)', async () => {
    const draft = await service.createDraft(TENANT, {
      projectId: 'prj_sunrise',
      name: 'Sunrise default',
      ratePercent: 2.5,
      splitRules: [
        { role: 'PRIMARY', recipientId: 'usr_agent_01', percent: 70 },
        { role: 'AGENCY', recipientId: 'agcy_sunrise', percent: 30 },
      ],
    });

    expect(draft.data.attributes.status).toBe('DRAFT');
    expect(draft.data.attributes.version).toBe(1);

    const published = await service.publish(TENANT, draft.data.id);
    expect(published.data.attributes.status).toBe('PUBLISHED');
    expect(published.data.attributes.publishedAt).toBeDefined();

    await expect(
      service.updateDraft(TENANT, draft.data.id, { name: 'Changed' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects invalid split rules on create', async () => {
    await expect(
      service.createDraft(TENANT, {
        projectId: 'prj_sunrise',
        name: 'Bad split',
        ratePercent: 2.5,
        splitRules: [{ role: 'PRIMARY', recipientId: 'usr_agent_01', percent: 50 }],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});
