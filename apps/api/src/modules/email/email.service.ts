import { Inject, Injectable, Logger, Optional, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt, randomUUID } from 'crypto';
import { EntityManager, Repository } from 'typeorm';
import { EmailDeliveryEntity } from '../../database/entities/email-delivery.entity';
import { AuditService } from '../audit/audit.service';
import { hashChannelDest, maskChannelDest, readEsignOtpPepper, safeSignatureMetadata } from '../booking/esign-otp-policy';
import { assertLiveEmailCredentials, LiveEmailSender, SandboxEmailSender } from './email-sender';
import { EMAIL_SENDER, EMAIL_TEMPLATES, type EmailSendResult, type EmailSender } from './email.types';

export type EmailDispatchInput = {
  to: string;
  templateId: string;
  params?: Record<string, unknown>;
  source?: { type: 'ESIGN_LINK' | 'ESIGN_OTP' | 'CHANNEL_VERIFY'; id: string };
  persistOtp?: boolean;
};

function storedParams(params: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (['otp', 'token', 'to', 'email', 'signingUrl', 'phone'].includes(key)) continue;
    if (typeof value === 'string' && (value.includes('v1s.') || value.includes('@'))) continue;
    safe[key] = value;
  }
  return safe;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectRepository(EmailDeliveryEntity)
    private readonly deliveries: Repository<EmailDeliveryEntity>,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    @Optional() @Inject(EMAIL_SENDER) private readonly injectedSender?: EmailSender,
  ) {}

  read(key: string): string | undefined {
    return this.config.get<string>(key);
  }

  isSandbox(): boolean {
    const flag = this.read('EMAIL_SANDBOX')?.trim();
    if (flag === 'true') return true;
    if (flag === 'false') return false;
    throw new UnprocessableEntityException({ detail: 'email sandbox is not configured' });
  }

  assertReady(templateId: string): void {
    void templateId;
    const sandbox = this.isSandbox();
    if (sandbox) return;
    assertLiveEmailCredentials((key) => this.read(key));
  }

  sender(): EmailSender {
    if (this.injectedSender) return this.injectedSender;
    return this.isSandbox() ? new SandboxEmailSender() : new LiveEmailSender((key) => this.read(key));
  }

  async findBySource(
    tenantId: string,
    source: { type: 'ESIGN_LINK' | 'ESIGN_OTP' | 'CHANNEL_VERIFY'; id: string },
    manager?: EntityManager,
  ) {
    const deliveries = manager ? manager.getRepository(EmailDeliveryEntity) : this.deliveries;
    return deliveries.findOne({ where: { tenantId, sourceType: source.type, sourceId: source.id } });
  }

  async send(tenantId: string, input: EmailDispatchInput, manager?: EntityManager): Promise<EmailSendResult & {
    deliveryId: string;
    sandbox: boolean;
    otp?: string;
    idempotentReplay?: boolean;
    status: string;
  }> {
    this.assertReady(input.templateId);
    const pepper = readEsignOtpPepper((key) => this.read(key));
    if (!pepper) {
      throw new UnprocessableEntityException({ detail: 'esign otp pepper is not configured' });
    }
    const deliveries = manager ? manager.getRepository(EmailDeliveryEntity) : this.deliveries;
    if (input.source) {
      const existing = await deliveries.findOne({
        where: { tenantId, sourceType: input.source.type, sourceId: input.source.id },
      });
      if (existing) {
        if (existing.status === 'SENT') {
          return {
            deliveryId: existing.id,
            providerRef: existing.providerRef ?? existing.id,
            sandbox: this.isSandbox(),
            idempotentReplay: true,
            status: existing.status,
          };
        }
        if (existing.status === 'FAILED' || existing.status === 'QUEUED') {
          return this.deliver(tenantId, existing, input, deliveries);
        }
        throw new UnprocessableEntityException({ detail: 'e-sign link is already sending' });
      }
    }

    const sandbox = this.isSandbox();
    const params = { ...(input.params ?? {}) };
    if (
      (input.templateId === EMAIL_TEMPLATES.OTP || input.templateId === EMAIL_TEMPLATES.CHANNEL_VERIFY) &&
      typeof params.otp !== 'string'
    ) {
      params.otp = sandbox ? '123456' : String(randomInt(100000, 999999));
    }
    const otp = typeof params.otp === 'string' ? params.otp : undefined;
    const row = deliveries.create({
      id: `eml_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      templateId: input.templateId,
      destMasked: maskChannelDest(input.to),
      destHash: hashChannelDest(input.to, pepper),
      status: 'QUEUED',
      params: storedParams(params),
      providerRef: null,
      lastError: null,
      sourceType: input.source?.type ?? null,
      sourceId: input.source?.id ?? null,
    });
    await deliveries.save(row);
    if (manager) {
      return {
        deliveryId: row.id,
        providerRef: row.providerRef ?? row.id,
        sandbox,
        status: row.status,
        otp: input.persistOtp === false ? otp : undefined,
      };
    }
    return this.deliver(tenantId, row, { ...input, params }, deliveries, otp);
  }

  async markFailed(tenantId: string, deliveryId: string): Promise<void> {
    const row = await this.deliveries.findOne({ where: { id: deliveryId, tenantId } });
    if (!row || row.status === 'SENT') return;
    row.status = 'FAILED';
    row.lastError = 'email send failed';
    await this.deliveries.save(row);
  }

  async completeQueued(
    tenantId: string,
    deliveryId: string,
    input: EmailDispatchInput,
  ) {
    const row = await this.deliveries.findOne({ where: { id: deliveryId, tenantId } });
    if (!row) {
      throw new UnprocessableEntityException({ detail: 'e-sign link was not sent' });
    }
    return this.deliver(tenantId, row, input, this.deliveries);
  }

  private async deliver(
    tenantId: string,
    row: EmailDeliveryEntity,
    input: EmailDispatchInput,
    deliveries: Repository<EmailDeliveryEntity>,
    otp?: string,
  ) {
    const sandbox = this.isSandbox();
    try {
      const sent = await this.sender().send({
        to: input.to,
        templateId: input.templateId,
        params: input.params ?? {},
        trackingId: row.id,
      });
      row.status = 'SENT';
      row.providerRef = sent.providerRef;
      row.lastError = null;
      await deliveries.save(row);
      await this.audit.append(
        {
          tenantId,
          entityType: 'email_delivery',
          entityId: row.id,
          action: 'EMAIL_SENT',
          payload: safeSignatureMetadata({
            templateId: row.templateId,
            destMasked: row.destMasked,
            sandbox,
            sourceType: row.sourceType,
          }),
          actorId: null,
        },
        deliveries.manager,
      );
      return {
        deliveryId: row.id,
        providerRef: sent.providerRef,
        sandbox,
        otp: input.persistOtp === false ? otp : undefined,
        status: row.status,
      };
    } catch (error) {
      row.status = 'FAILED';
      row.lastError = 'email send failed';
      await deliveries.save(row);
      this.logger.warn(`email failed ${row.id}`);
      throw error;
    }
  }
}
