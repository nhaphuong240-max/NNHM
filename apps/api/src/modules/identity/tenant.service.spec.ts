import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { TenantService } from './tenant.service';

describe('TenantService', () => {
  let service: TenantService;
  let rows: TenantEntity[];

  beforeEach(async () => {
    rows = [
      {
        id: 'ten_dev_01',
        name: 'Sunrise Development (Pilot)',
        type: 'DEVELOPER',
        isActive: true,
        createdAt: new Date(),
      } as TenantEntity,
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: getRepositoryToken(TenantEntity),
          useValue: {
            find: jest.fn(async () => rows.filter((r) => r.isActive)),
            findOne: jest.fn(async ({ where }: { where: { id?: string } }) =>
              rows.find((r) => r.id === where.id) ?? null,
            ),
            save: jest.fn(async (row: Partial<TenantEntity>) => {
              const saved = { ...row, createdAt: new Date() } as TenantEntity;
              rows.push(saved);
              return saved;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(TenantService);
  });

  it('lists active tenants for login picker', async () => {
    const result = await service.listPublicTenants();
    expect(result.data[0].id).toBe('ten_dev_01');
  });

  it('creates tenant onboarding stub', async () => {
    const result = await service.createTenant({
      name: 'Agency Pilot',
      type: 'AGENCY',
      slug: 'agency-pilot',
    });
    expect(result.data.id).toBe('ten_agency-pilot');
  });

  it('409 on duplicate tenant slug', async () => {
    await expect(
      service.createTenant({ name: 'Dup', type: 'DEVELOPER', slug: 'dev_01' }),
    ).rejects.toThrow(ConflictException);
  });

  it('404 when tenant missing', async () => {
    await expect(service.getTenant('missing')).rejects.toThrow(NotFoundException);
  });
});
