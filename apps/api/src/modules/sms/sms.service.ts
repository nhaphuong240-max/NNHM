import { Injectable, Logger, NotFoundException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { SmsBindingEntity } from '../../database/entities/sms-binding.entity';
import { SmsDeliveryEntity } from '../../database/entities/sms-delivery.entity';
import { AuditService } from '../audit/audit.service';
import { SmsProviderClient } from './sms-provider.client';
import { SMS_TEMPLATES, type SmsSendInput, type SmsSendResult } from './sms.types';
import { RailResolverService } from '../tenant-config/rail-resolver.service';

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s+/g, '');
}

function generateOtp(sandbox: boolean): string {
  if (sandbox) return '123456';
  return String(randomInt(100000, 999999));
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @InjectRepository(SmsDeliveryEntity)
    private readonly deliveries: Repository<SmsDeliveryEntity>,
    @InjectRepository(SmsBindingEntity)
    private readonly bindings: Repository<SmsBindingEntity>,
    private readonly provider: SmsProviderClient,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly rails: RailResolverService,
  ) {}

  status() {
    return {
      module: 'sms-gateway',
      uc: 'UC-NW-03',
      rules: ['BR-15'],
      screen: 'SCR-ADMIN-012',
    };
  }

  async getIntegrationStatus(tenantId: string) {
    const [bindings, recentDeliveries, sentCount, failedCount, deliveredCount] =
      await Promise.all([
        this.bindings.find({ where: { tenantId, isActive: true } }),
        this.deliveries.find({
          where: { tenantId },
          order: { createdAt: 'DESC' },
          take: 15,
        }),
        this.deliveries.count({ where: { tenantId, status: 'SENT' } }),
        this.deliveries.count({ where: { tenantId, status: 'FAILED' } }),
        this.deliveries.count({ where: { tenantId, status: 'DELIVERED' } }),
      ]);

    const primary = bindings[0] ?? null;

    return {
      data: {
        channel: 'SMS' as const,
        graphMode: await this.provider.graphMode(tenantId, primary),
        bindings: bindings.map((b) => ({
          id: b.id,
          provider: b.provider,
          brandName: b.brandName,
          senderId: b.senderId,
          isActive: b.isActive,
          hasApiKey: Boolean(b.apiKey),
        })),
        templates: Object.values(SMS_TEMPLATES),
        stats: {
          sent: sentCount,
          delivered: deliveredCount,
          failed: failedCount,
        },
        recentDeliveries: recentDeliveries.map((d) => ({
          id: d.id,
          templateId: d.templateId,
          phone: d.phone,
          status: d.status,
          providerRef: d.providerRef,
          sourceType: d.sourceType,
          sourceId: d.sourceId,
          createdAt: d.createdAt.toISOString(),
          lastError: d.lastError,
        })),
      },
      meta: { tenantId },
    };
  }

  /** OPS-S4-04 — reject demo OTP on tenant with smsSandbox=false. */
  async assertNotDemoOtp(tenantId: string, otp: string): Promise<void> {
    const resolved = await this.rails.resolve(tenantId);
    if (!resolved.smsSandbox && otp.trim() === '123456') {
      throw new UnauthorizedException({ detail: 'Demo OTP 123456 is not accepted' });
    }
  }

  async getPaymentOtp(tenantId: string, paymentIntentId: string): Promise<string | null> {
    const row = await this.deliveries.findOne({
      where: {
        tenantId,
        sourceType: 'PAYMENT_OTP',
        sourceId: paymentIntentId,
      },
    });
    const otp = row?.params?.otp;
    return typeof otp === 'string' ? otp : null;
  }

  async getEsignOtp(tenantId: string, contractId: string): Promise<string | null> {
    const row = await this.deliveries.findOne({
      where: {
        tenantId,
        sourceType: 'ESIGN_OTP',
        sourceId: contractId,
      },
    });
    const otp = row?.params?.otp;
    return typeof otp === 'string' ? otp : null;
  }

  async sendSms(tenantId: string, input: SmsSendInput): Promise<SmsSendResult> {
    if (input.source) {
      const existing = await this.deliveries.findOne({
        where: {
          tenantId,
          sourceType: input.source.type,
          sourceId: input.source.id,
        },
      });
      if (existing) {
        const binding = await this.bindings.findOne({ where: { tenantId, isActive: true } });
        const sandbox = await this.provider.isSandboxMode(tenantId);
        return {
          deliveryId: existing.id,
          status: existing.status,
          providerRef: existing.providerRef,
          sandbox,
          graphMode: await this.provider.graphMode(tenantId, binding),
          idempotentReplay: true,
          otp:
            sandbox && typeof existing.params?.otp === 'string' ? existing.params.otp : undefined,
        };
      }
    }

    const binding = await this.bindings.findOne({ where: { tenantId, isActive: true } });
    if (!binding) {
      throw new NotFoundException({ detail: 'No active SMS binding for tenant' });
    }

    const deliveryId = `sms_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const sandbox = await this.provider.isSandboxMode(tenantId);
    const phone = normalizePhone(input.phone);
    const params = { ...(input.params ?? {}) };

    if (input.templateId === SMS_TEMPLATES.OTP && !params.otp) {
      params.otp = generateOtp(sandbox);
    }

    if (sandbox) {
      const row = await this.deliveries.save({
        id: deliveryId,
        tenantId,
        templateId: input.templateId,
        phone,
        params,
        status: 'SENT',
        providerRef: `sandbox_${deliveryId}`,
        lastError: null,
        sourceType: input.source?.type ?? null,
        sourceId: input.source?.id ?? null,
      });

      await this.audit.append({
        tenantId,
        entityType: 'sms_delivery',
        entityId: row.id,
        action: 'SMS_SENT',
        payload: {
          templateId: row.templateId,
          phone: row.phone,
          sandbox: true,
          providerRef: row.providerRef,
          sourceType: row.sourceType,
          sourceId: row.sourceId,
        },
        actorId: null,
      });

      this.logger.log(`UC-NW-03 SMS sandbox ${row.id} → ${phone}`);

      return {
        deliveryId: row.id,
        status: row.status,
        providerRef: row.providerRef,
        sandbox: true,
        graphMode: 'SANDBOX',
        otp: typeof params.otp === 'string' ? params.otp : undefined,
      };
    }

    let row: SmsDeliveryEntity = await this.deliveries.save({
      id: deliveryId,
      tenantId,
      templateId: input.templateId,
      phone,
      params,
      status: 'QUEUED',
      providerRef: null,
      lastError: null,
      sourceType: input.source?.type ?? null,
      sourceId: input.source?.id ?? null,
    });

    try {
      const sent = await this.provider.sendTemplate({
        tenantId,
        phone,
        templateId: input.templateId,
        params,
        brandName: binding.brandName,
        trackingId: deliveryId,
      });
      row.status = 'SENT';
      row.providerRef = sent.providerRef;
      row = await this.deliveries.save(row);

      await this.audit.append({
        tenantId,
        entityType: 'sms_delivery',
        entityId: row.id,
        action: 'SMS_SENT',
        payload: {
          templateId: row.templateId,
          phone: row.phone,
          providerRef: row.providerRef,
        },
        actorId: null,
      });

      return {
        deliveryId: row.id,
        status: row.status,
        providerRef: row.providerRef,
        sandbox: false,
        graphMode: 'LIVE',
        otp: undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      row.status = 'FAILED';
      row.lastError = message;
      await this.deliveries.save(row);
      throw err;
    }
  }

  /** Sandbox — simulate OTP/notify without external provider */
  async simulateSend(
    tenantId: string,
    input: { phone?: string; templateId?: string; message?: string },
  ) {
    return this.sendSms(tenantId, {
      templateId: input.templateId?.trim() || SMS_TEMPLATES.TRANSACTION_NOTIFY,
      phone: input.phone?.trim() || '+84901234567',
      params: input.message ? { message: input.message } : { demo: true },
      source: { type: 'MANUAL', id: `sim_${randomUUID().replace(/-/g, '').slice(0, 8)}` },
    });
  }

  /** Delivery report webhook simulate (pilot) */
  async markDelivered(tenantId: string, deliveryId: string) {
    const row = await this.deliveries.findOne({ where: { id: deliveryId, tenantId } });
    if (!row) {
      throw new NotFoundException({ detail: `SMS delivery ${deliveryId} not found` });
    }
    row.status = 'DELIVERED';
    await this.deliveries.save(row);
    return { deliveryId: row.id, status: row.status };
  }
}
