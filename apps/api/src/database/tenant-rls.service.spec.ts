import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TenantRlsService } from './tenant-rls.service';

describe('TenantRlsService', () => {
  let service: TenantRlsService;
  const query = jest.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    query.mockClear();
    const module = await Test.createTestingModule({
      providers: [
        TenantRlsService,
        {
          provide: DataSource,
          useValue: {
            query,
            driver: { master: null },
          },
        },
      ],
    }).compile();

    service = module.get(TenantRlsService);
    service.onModuleInit();
  });

  it('binds tenant session variables', async () => {
    await service.bindRequestContext('ten_dev_01', false);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('app.current_tenant_id'),
      ['ten_dev_01', 'false'],
    );
  });

  it('runs callback as platform admin', async () => {
    const result = await service.runAsPlatformAdmin(async () => 'ok');
    expect(result).toBe('ok');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('app.is_platform_admin'),
      ['', 'true'],
    );
  });
});
