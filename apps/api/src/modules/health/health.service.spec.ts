import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ProductionSecurityService } from '../../infrastructure/security/production-security.service';
import { RedisConnectionService } from '../../infrastructure/redis/redis-connection.service';
import { AnchorTenantService } from '../anchor/anchor-tenant.service';
import { AgentWauService } from '../analytics/agent-wau.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: getDataSourceToken(),
          useValue: {
            query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
            showMigrations: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: RedisConnectionService,
          useValue: { ping: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_k: string, def?: string) => def) },
        },
        {
          provide: ProductionSecurityService,
          useValue: {
            getChecks: jest.fn().mockReturnValue([{ id: 'C-01', ok: true, detail: 'ok' }]),
            isStrict: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: AnchorTenantService,
          useValue: {
            getNetworkScaleStatus: jest.fn().mockResolvedValue({
              liveAnchorCount: 3,
              syntheticAnchorCount: 3,
              crossAnchorDepositedBookings: 1,
            }),
          },
        },
        {
          provide: AgentWauService,
          useValue: {
            getPlatformWauMetrics: jest.fn().mockResolvedValue({ wau7d: 520, wauSimEnabled: false }),
          },
        },
      ],
    }).compile();
    service = module.get(HealthService);
  });

  it('returns ok when database and redis are reachable', async () => {
    const result = await service.check();
    expect(result.status).toBe('ok');
    expect(result.checks.database).toBe('up');
    expect(result.checks.redis).toBe('up');
  });
});
