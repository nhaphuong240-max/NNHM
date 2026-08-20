import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configEnvReader } from '../../infrastructure/config-env-reader';
import {
  liveRailsFromEnv,
  mergeLiveRails,
  parseLiveRailsOverlay,
  type LiveRails,
} from './live-rails.util';
import { TenantConfigService } from './tenant-config.service';

@Injectable()
export class RailResolverService {
  constructor(
    private readonly tenantConfig: TenantConfigService,
    private readonly config: ConfigService,
  ) {}

  async resolve(tenantId: string): Promise<LiveRails> {
    const overlay = await this.tenantConfig.loadLiveRailsOverlay(tenantId);
    return mergeLiveRails(liveRailsFromEnv(configEnvReader(this.config)), overlay);
  }

  async saveOverlay(
    tenantId: string,
    overlay: Partial<LiveRails>,
    actorId?: string | null,
  ): Promise<LiveRails> {
    const current = await this.tenantConfig.loadLiveRailsOverlay(tenantId);
    const next = { ...current, ...parseLiveRailsOverlay(overlay as Record<string, unknown>) };
    await this.tenantConfig.saveLiveRailsOverlay(tenantId, next, actorId);
    return this.resolve(tenantId);
  }

  async assertSimulateAllowed(tenantId: string): Promise<void> {
    const rails = await this.resolve(tenantId);
    if (rails.simulateEndpoints) return;
    throw new ForbiddenException({
      type: 'https://wereal.dev/problems/simulate-disabled',
      title: 'Simulate disabled',
      detail: `LIVE_RAILS.simulateEndpoints=false for tenant ${tenantId}`,
    });
  }
}
