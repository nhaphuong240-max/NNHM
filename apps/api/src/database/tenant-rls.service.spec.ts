import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { currentRlsContext, TenantRlsService } from './tenant-rls.service';

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

  it('does not bind the tenant on a random pooled query', async () => {
    await service.runAsTenant('ten_dev_01', async () => {
      expect(currentRlsContext()).toEqual({ tenantId: 'ten_dev_01', isPlatformAdmin: false });
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('runs callback as platform admin on the same async context', async () => {
    const result = await service.runAsPlatformAdmin(async () => {
      expect(currentRlsContext()).toEqual({ tenantId: '', isPlatformAdmin: true });
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(query).not.toHaveBeenCalled();
  });
});
