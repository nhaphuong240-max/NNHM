import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AgencyApplicationEntity } from '../../database/entities/agency-application.entity';
import { DistributionPolicyEntity } from '../../database/entities/distribution-policy.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { AuditService } from '../audit/audit.service';
import { MarketingService } from './marketing.service';

const DEV_TENANT = 'ten_dev_01';
const AGENCY_TENANT = 'ten_agency_01';
const PROJECT_ID = 'prj_sunrise';

describe('MarketingService', () => {
  let service: MarketingService;
  let policies: DistributionPolicyEntity[];
  let applications: AgencyApplicationEntity[];

  beforeEach(async () => {
    policies = [];
    applications = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingService,
        {
          provide: getRepositoryToken(DistributionPolicyEntity),
          useValue: {
            find: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
              policies.filter((p) =>
                Object.entries(where).every(([k, v]) => (p as unknown as Record<string, unknown>)[k] === v),
              ),
            ),
            findOne: jest.fn(async ({ where, order }: { where: Record<string, unknown>; order?: Record<string, string> }) => {
              let rows = policies.filter((p) =>
                Object.entries(where).every(([k, v]) => (p as unknown as Record<string, unknown>)[k] === v),
              );
              if (order?.version === 'DESC') {
                rows = [...rows].sort((a, b) => b.version - a.version);
              }
              return rows[0] ?? null;
            }),
            save: jest.fn(async (row: DistributionPolicyEntity) => {
              const saved = {
                ...row,
                createdAt: row.createdAt ?? new Date(),
                updatedAt: new Date(),
              };
              policies.push(saved);
              return saved;
            }),
          },
        },
        {
          provide: getRepositoryToken(AgencyApplicationEntity),
          useValue: {
            find: jest.fn(async () => applications),
            findOne: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
              applications.find((a) =>
                Object.entries(where).every(([k, v]) => (a as unknown as Record<string, unknown>)[k] === v),
              ) ?? null,
            ),
            save: jest.fn(async (row: AgencyApplicationEntity) => {
              const saved = {
                ...row,
                createdAt: row.createdAt ?? new Date(),
                updatedAt: new Date(),
              };
              applications.push(saved);
              return saved;
            }),
          },
        },
        {
          provide: getRepositoryToken(ProjectEntity),
          useValue: {
            find: jest.fn(async () => [
              { id: PROJECT_ID, tenantId: DEV_TENANT, code: 'SUNRISE-A', name: 'Sunrise Tower A' },
            ]),
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) =>
              where.id === PROJECT_ID && where.tenantId === DEV_TENANT
                ? { id: PROJECT_ID, tenantId: DEV_TENANT, code: 'SUNRISE-A', name: 'Sunrise Tower A' }
                : null,
            ),
          },
        },
        {
          provide: getRepositoryToken(TenantEntity),
          useValue: {
            find: jest.fn(async () => [
              { id: DEV_TENANT, name: 'Sunrise Development', type: 'DEVELOPER', isActive: true },
              { id: AGENCY_TENANT, name: 'Sunrise Realty Agency', type: 'AGENCY', isActive: true },
            ]),
            findOne: jest.fn(async ({ where }: { where: { id: string } }) => {
              if (where.id === AGENCY_TENANT) {
                return { id: AGENCY_TENANT, name: 'Sunrise Realty Agency', type: 'AGENCY', isActive: true };
              }
              if (where.id === DEV_TENANT) {
                return { id: DEV_TENANT, name: 'Sunrise Development', type: 'DEVELOPER', isActive: true };
              }
              return null;
            }),
          },
        },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    service = module.get(MarketingService);
  });

  it('publishes distribution policy for developer project', async () => {
    const created = await service.createPolicy(DEV_TENANT, {
      projectId: PROJECT_ID,
      name: 'Sunrise co-broker pilot',
      terms: { regions: ['HCM'], maxAgencies: 5 },
    });
    const published = await service.publishPolicy(DEV_TENANT, created.data.id);
    expect(published.data.attributes.status).toBe('PUBLISHED');
  });

  it('supports cross-tenant marketplace apply', async () => {
    policies.push({
      id: 'dp_seed01',
      tenantId: DEV_TENANT,
      projectId: PROJECT_ID,
      version: 1,
      status: 'PUBLISHED',
      name: 'Seed policy',
      terms: {},
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const marketplace = await service.listMarketplaceProjects(AGENCY_TENANT);
    expect(marketplace.data).toHaveLength(1);
    expect(marketplace.data[0].developerTenantId).toBe(DEV_TENANT);

    const applied = await service.submitApplication(AGENCY_TENANT, {
      developerTenantId: DEV_TENANT,
      projectId: PROJECT_ID,
      distributionPolicyId: 'dp_seed01',
      message: 'Pilot co-broker',
    });
    expect(applied.data.attributes.status).toBe('PENDING');

    const reviewed = await service.reviewApplication(DEV_TENANT, applied.data.id, {
      status: 'APPROVED',
    });
    expect(reviewed.data.attributes.status).toBe('APPROVED');

    const ok = await service.isAgencyApproved(AGENCY_TENANT, DEV_TENANT, PROJECT_ID);
    expect(ok).toBe(true);
  });
});
