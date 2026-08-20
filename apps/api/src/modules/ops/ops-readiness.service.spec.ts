import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpsReadinessService } from './ops-readiness.service';

describe('OpsReadinessService', () => {
  let service: OpsReadinessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpsReadinessService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              if (key === 'GRAFANA_STAGING_URL') return 'https://grafana.staging.wereal.vn';
              if (key === 'GRAFANA_ALERTS_ENABLED') return 'true';
              if (key === 'ONCALL_ROSTER') return 'L1→Finance→TechLead';
              return fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(OpsReadinessService);
  });

  it('returns G-OPS-4 readiness snapshot', () => {
    const result = service.snapshot();
    expect(result.data.gate).toBe('G-OPS-4');
    expect(result.data.grafana.stagingUrl).toContain('grafana');
    expect(result.data.onCall.roster).toBe('L1→Finance→TechLead');
    expect(result.meta.uc).toContain('OPS-S6-01');
  });
});
