import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RailResolverService } from './rail-resolver.service';
import { TenantConfigService } from './tenant-config.service';

describe('RailResolverService', () => {
  let rails: RailResolverService;
  let overlay: Record<string, unknown>;

  beforeEach(async () => {
    overlay = {};
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RailResolverService,
        {
          provide: TenantConfigService,
          useValue: {
            loadLiveRailsOverlay: jest.fn(async () => overlay),
            saveLiveRailsOverlay: jest.fn(async (_tenant: string, next: Record<string, unknown>) => {
              overlay = next;
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, fallback?: unknown) => fallback) },
        },
      ],
    }).compile();
    rails = module.get(RailResolverService);
  });

  it('uses env MOCK when tenant has no overlay', async () => {
    const resolved = await rails.resolve('ten_dev_01');
    expect(resolved.paymentMethod).toBe('MOCK');
    expect(resolved.simulateEndpoints).toBe(true);
  });

  it('tenant overlay wins for paymentMethod and simulateEndpoints', async () => {
    overlay = { paymentMethod: 'VNPAY', simulateEndpoints: false, mfaSandbox: false };
    const resolved = await rails.resolve('ten_pilot_cdt_01');
    expect(resolved.paymentMethod).toBe('VNPAY');
    expect(resolved.simulateEndpoints).toBe(false);
    expect(resolved.mfaSandbox).toBe(false);
  });

  it('supports pushLiveEnabled overlay (OPS-S4-05)', async () => {
    overlay = { pushLiveEnabled: true, znsSandbox: false, smsSandbox: false };
    const resolved = await rails.resolve('ten_pilot_cdt_01');
    expect(resolved.pushLiveEnabled).toBe(true);
    expect(resolved.znsSandbox).toBe(false);
    expect(resolved.smsSandbox).toBe(false);
  });

  it('assertSimulateAllowed throws when overlay disables simulate', async () => {
    overlay = { simulateEndpoints: false };
    await expect(rails.assertSimulateAllowed('ten_pilot_cdt_01')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
