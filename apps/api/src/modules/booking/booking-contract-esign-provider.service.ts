import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RailResolverService } from '../tenant-config/rail-resolver.service';
import { EsignAdapterRegistry } from './vnpt-esign.adapter';

@Injectable()
export class BookingContractEsignProviderService {
  constructor(
    private readonly adapters: EsignAdapterRegistry,
    private readonly config: ConfigService,
    private readonly rails: RailResolverService,
  ) {}

  /** OPS-S5-04 — tenant esignSandbox=false disables WEREAL_ESIGN_STUB on LIVE pilot. */
  async status(tenantId: string) {
    const resolved = await this.rails.resolve(tenantId);
    const provider = this.config.get<string>('ESIGN_PROVIDER', 'VNPT_SMARTCA');
    const envStub = this.config.get<string>('WEREAL_ESIGN_STUB', 'false') === 'true';
    const useStub = envStub && resolved.esignSandbox;
    return {
      provider,
      sandbox: resolved.esignSandbox,
      useStub,
      mode: useStub ? 'stub' : 'legal-provider',
    };
  }

  async resolve(tenantId: string) {
    const resolved = await this.rails.resolve(tenantId);
    const envStub = this.config.get<string>('WEREAL_ESIGN_STUB', 'false') === 'true';
    if (envStub && resolved.esignSandbox) {
      return null;
    }
    return this.adapters.resolve();
  }

  registry() {
    return this.adapters;
  }
}
