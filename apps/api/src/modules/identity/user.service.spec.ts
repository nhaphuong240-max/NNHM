import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  const users: UserEntity[] = [
    {
      id: 'usr_agent_01',
      tenantId: 'ten_dev_01',
      email: 'agent@sunrise-dev.vn',
      passwordHash: 'x',
      role: 'AGENT',
      isActive: true,
      createdAt: new Date(),
    } as UserEntity,
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            find: jest.fn(async ({ where }: { where: { tenantId?: string } }) =>
              users.filter((u) => u.tenantId === where.tenantId),
            ),
            findOne: jest.fn(async ({ where }: { where: { id?: string; tenantId?: string } }) =>
              users.find((u) => u.id === where.id && u.tenantId === where.tenantId) ?? null,
            ),
            save: jest.fn(async (row: UserEntity) => {
              const idx = users.findIndex((u) => u.id === row.id);
              if (idx >= 0) users[idx] = row;
              return row;
            }),
          },
        },
        {
          provide: AuditService,
          useValue: { append: jest.fn(async () => undefined) },
        },
      ],
    }).compile();

    service = module.get(UserService);
  });

  it('lists tenant users', async () => {
    const result = await service.listUsers('ten_dev_01');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].attributes.email).toBe('agent@sunrise-dev.vn');
  });

  it('404 for unknown user', async () => {
    await expect(service.getUser('ten_dev_01', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('patches user role (UC-ID-02)', async () => {
    const result = await service.patchUserRole('ten_dev_01', 'usr_agent_01', 'OPS_ADMIN');
    expect(result.data.attributes.role).toBe('OPS_ADMIN');
  });
});
