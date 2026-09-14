import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsBindingEntity } from '../../database/entities/sms-binding.entity';
import { ZaloOaBindingEntity } from '../../database/entities/zalo-oa-binding.entity';
import { SmsProviderClient } from '../sms/sms-provider.client';
import { RailResolverService } from '../tenant-config/rail-resolver.service';

/** Phase A — SMS/ZNS production readiness status for ops. */
@Injectable()
export class NotifyRailsService {
  constructor(
    private readonly config: ConfigService,
    private readonly rails: RailResolverService,
    private readonly smsProvider: SmsProviderClient,
    @InjectRepository(SmsBindingEntity)
    private readonly smsBindings: Repository<SmsBindingEntity>,
    @InjectRepository(ZaloOaBindingEntity)
    private readonly zaloBindings: Repository<ZaloOaBindingEntity>,
  ) {}

  async status(tenantId: string) {
    const resolved = await this.rails.resolve(tenantId);
    const [smsBinding, zaloBinding] = await Promise.all([
      this.smsBindings.findOne({ where: { tenantId, isActive: true } }),
      this.zaloBindings.findOne({ where: { tenantId, isActive: true } }),
    ]);

    const smsMode = await this.smsProvider.graphMode(tenantId, smsBinding);
    const znsSandbox = resolved.znsSandbox;
    const smsSandbox = resolved.smsSandbox;

    const smsProdReady =
      !smsSandbox &&
      Boolean(smsBinding?.apiKey || this.config.get<string>('SMS_PROVIDER_API_KEY'));
    const znsProdReady =
      !znsSandbox &&
      Boolean(zaloBinding?.accessToken || this.config.get<string>('ZALO_OA_ACCESS_TOKEN'));

    return {
      data: {
        sms: {
          mode: smsMode,
          sandbox: smsSandbox,
          prodReady: smsProdReady,
          hasBinding: Boolean(smsBinding),
        },
        zns: {
          sandbox: znsSandbox,
          prodReady: znsProdReady,
          hasBinding: Boolean(zaloBinding),
        },
        envHints: {
          SMS_SANDBOX: this.config.get<string>('SMS_SANDBOX', 'true'),
          ZALO_ZNS_SANDBOX: this.config.get<string>('ZALO_ZNS_SANDBOX', 'true'),
          enableProd:
            'Set SMS_SANDBOX=false, ZALO_ZNS_SANDBOX=false and provider keys on VPS; or PATCH tenant LIVE_RAILS',
        },
      },
      meta: { tenantId, fr: 'FR-NOT-001b', phase: 'A' },
    };
  }
}
