import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SignatureEventEntity } from '../../database/entities/signature-event.entity';
import { EmailService } from '../email/email.service';
import { EMAIL_TEMPLATES } from '../email/email.types';
import { SmsService } from '../sms/sms.service';
import { SMS_TEMPLATES } from '../sms/sms.types';
import { contractSignSecret, type ContractSignChannel, type ContractSignClaims } from './contract-sign-token';
import {
  ADVISORY_LOCK_SQL,
  ADVISORY_UNLOCK_SQL,
  LATEST_LINK_SQL,
  VOID_OPEN_TICKETS_SQL,
  returnedRows,
} from './esign-otp-atomic';
import { EsignOtpChallengeService } from './esign-otp-challenge.service';
import {
  decideEsignResend,
  ESIGN_OTP_RESEND_COOLDOWN_ENV,
  hashChannelDest,
  maskChannelDest,
  readConfiguredPositiveInt,
  readEsignOtpPepper,
  safeSignatureMetadata,
} from './esign-otp-policy';
import {
  buildSigningUrl,
  ESIGN_LINK_CHANNEL_ENV,
  ESIGN_LINK_FALLBACK_CHANNELS_ENV,
  ESIGN_SIGNING_BASE_URL_ENV,
  ESIGN_ZNS_ENABLED_ENV,
  parseEsignChannel,
  parseFallbackChannels,
  pickRegisteredChannel,
  znsEnabled,
} from './esign-link.policy';
import { SignatureTicketService } from './signature-ticket.service';

export type SendSignLinkInput = {
  tenantId: string;
  contractId: string;
  bookingId: string;
  buyerId: string;
  buyerName: string;
  resend?: boolean;
};

export type SendSignLinkResult = {
  sent: boolean;
  channel: ContractSignChannel;
  destMasked: string;
  deliveryId: string;
  sandbox: boolean;
  idempotentReplay?: boolean;
  signingUrl?: string;
};

@Injectable()
export class EsignLinkService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly tickets: SignatureTicketService,
    private readonly challenges: EsignOtpChallengeService,
    private readonly email: EmailService,
    private readonly sms: SmsService,
  ) {}

  async send(input: SendSignLinkInput): Promise<SendSignLinkResult> {
    const secret = contractSignSecret((key) => this.config.get<string>(key));
    if (!secret) {
      throw new UnprocessableEntityException({ detail: 'contract sign secret is not configured' });
    }
    const baseUrl = this.config.get<string>(ESIGN_SIGNING_BASE_URL_ENV)?.trim();
    if (!baseUrl) {
      throw new UnprocessableEntityException({ detail: 'esign signing base url is not configured' });
    }
    const dest = await this.resolveDest(input.tenantId, input.bookingId);
    await this.assertChannelReady(input.tenantId, dest.channel);
    const prefix = `${input.contractId}:${input.buyerId}`;
    const lockKey = `esign-link:${input.tenantId}:${prefix}`;
    await this.dataSource.query(ADVISORY_LOCK_SQL, [lockKey]);
    try {
      const latest = returnedRows(await this.dataSource.query(LATEST_LINK_SQL, [input.tenantId, `${prefix}%`]))[0] as
        | { created_at: string | Date; status: string; source_id: string }
        | undefined;
      if (!input.resend && latest?.status === 'SENT' && latest.source_id === prefix) {
        return {
          sent: true,
          channel: dest.channel,
          destMasked: maskChannelDest(dest.value),
          deliveryId: 'replay',
          sandbox: dest.channel === 'EMAIL' ? this.email.isSandbox() : true,
          idempotentReplay: true,
        };
      }
      await this.challenges.assertSendBudget({
        tenantId: input.tenantId,
        contractId: input.contractId,
        buyerId: input.buyerId,
      } as ContractSignClaims);
      const decision = decideEsignResend({
        latestCreatedAtMs: latest ? new Date(latest.created_at).getTime() : null,
        latestExpiresAtMs: latest ? new Date(latest.created_at).getTime() + 15 * 60 * 1000 : null,
        latestConsumed: Boolean(input.resend),
        now: Date.now(),
        cooldownSeconds: readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_OTP_RESEND_COOLDOWN_ENV),
      });
      if (input.resend) {
        if (!latest) throw new UnprocessableEntityException({ detail: 'esign link has not been sent' });
        if (decision === 'unconfigured') {
          throw new UnprocessableEntityException({ detail: 'esign otp resend cooldown is not configured' });
        }
        if (decision === 'cooling') {
          throw new UnprocessableEntityException({ detail: 'esign otp resend is cooling down' });
        }
      }

      const runner = this.dataSource.createQueryRunner();
      await runner.connect();
      await runner.startTransaction();
      let minted: { token: string; claims: ContractSignClaims } | null = null;
      const sourceId = input.resend ? `${prefix}:${randomBytes(4).toString('hex')}` : prefix;
      try {
        if (input.resend) {
          await runner.query(VOID_OPEN_TICKETS_SQL, [input.tenantId, input.contractId, input.buyerId]);
        }
        const pepper = readEsignOtpPepper((key) => this.config.get<string>(key));
        if (!pepper) {
          throw new UnprocessableEntityException({ detail: 'esign otp pepper is not configured' });
        }
        minted = await this.tickets.issueBuyerAccess({
          tenantId: input.tenantId,
          contractId: input.contractId,
          buyerId: input.buyerId,
          secret,
          bookingId: input.bookingId,
          channel: dest.channel,
          channelDestHash: hashChannelDest(dest.value, pepper),
          channelDestMasked: maskChannelDest(dest.value),
          recordLinkSent: false,
        });
        await runner.commitTransaction();
      } catch (error) {
        await runner.rollbackTransaction();
        throw error;
      } finally {
        await runner.release();
      }

      if (!minted) {
        throw new UnprocessableEntityException({ detail: 'sign access ticket is required' });
      }
      const claims = minted.claims;
      const signingUrl = buildSigningUrl(baseUrl, {
        contractId: input.contractId,
        tenantId: input.tenantId,
        token: minted.token,
      });
      const action = input.resend ? 'LINK_RESENT' : 'LINK_SENT';
      try {
        const delivery = await this.dispatchLink({
          tenantId: input.tenantId,
          dest,
          buyerName: input.buyerName,
          contractId: input.contractId,
          sourceId,
          signingUrl,
        });
        await this.note(claims, action, { deliveryId: delivery.deliveryId, jti: claims.jti });
        return {
          sent: true,
          channel: dest.channel,
          destMasked: maskChannelDest(dest.value),
          deliveryId: delivery.deliveryId,
          sandbox: delivery.sandbox,
          signingUrl,
        };
      } catch (error) {
        await this.note(claims, 'LINK_FAILED', { jti: claims.jti });
        if (error instanceof UnprocessableEntityException) throw error;
        const message = error instanceof Error ? error.message : 'link send failed';
        throw new UnprocessableEntityException({ detail: `e-sign link send failed: ${message}` });
      }
    } finally {
      await this.dataSource.query(ADVISORY_UNLOCK_SQL, [lockKey]);
    }
  }

  private async assertChannelReady(tenantId: string, channel: ContractSignChannel): Promise<void> {
    if (channel === 'EMAIL') this.email.assertReady(EMAIL_TEMPLATES.SIGN_LINK);
    if (channel === 'SMS') await this.sms.assertEsignReady(tenantId);
    if (channel === 'ZALO' && !znsEnabled(this.config.get<string>(ESIGN_ZNS_ENABLED_ENV))) {
      throw new UnprocessableEntityException({ detail: 'esign zalo is disabled' });
    }
  }

  private async dispatchLink(input: {
    tenantId: string;
    dest: { channel: ContractSignChannel; value: string };
    buyerName: string;
    contractId: string;
    sourceId: string;
    signingUrl: string;
  }): Promise<{ deliveryId: string; sandbox: boolean }> {
    const params = { buyer_name: input.buyerName, contract_id: input.contractId };
    if (input.dest.channel === 'EMAIL') {
      try {
        const sent = await this.email.send(input.tenantId, {
          to: input.dest.value,
          templateId: EMAIL_TEMPLATES.SIGN_LINK,
          params: { ...params, signingUrl: input.signingUrl },
          source: { type: 'ESIGN_LINK', id: input.sourceId },
          persistOtp: false,
        });
        if (sent.status !== 'SENT') {
          throw new UnprocessableEntityException({ detail: 'e-sign link was not sent' });
        }
        return { deliveryId: sent.deliveryId, sandbox: sent.sandbox };
      } catch (error) {
        if (uniqueViolation(error)) {
          const replay = await this.email.send(input.tenantId, {
            to: input.dest.value,
            templateId: EMAIL_TEMPLATES.SIGN_LINK,
            params,
            source: { type: 'ESIGN_LINK', id: input.sourceId },
          });
          if (!replay.idempotentReplay || replay.status !== 'SENT') {
            throw new UnprocessableEntityException({ detail: 'e-sign link was not sent' });
          }
          return { deliveryId: replay.deliveryId, sandbox: replay.sandbox };
        }
        throw error;
      }
    }
    if (input.dest.channel === 'SMS') {
      try {
        const sent = await this.sms.sendSms(input.tenantId, {
          templateId: SMS_TEMPLATES.SIGN_LINK,
          phone: input.dest.value,
          persistOtp: false,
          maskStoredDest: true,
          params: { ...params, signingUrl: input.signingUrl },
          source: { type: 'ESIGN_LINK', id: input.sourceId },
        });
        if (sent.idempotentReplay && sent.status !== 'SENT') {
          throw new UnprocessableEntityException({ detail: 'e-sign link was not sent' });
        }
        if (sent.status !== 'SENT' && sent.status !== 'DELIVERED') {
          throw new UnprocessableEntityException({ detail: 'e-sign link was not sent' });
        }
        return { deliveryId: sent.deliveryId, sandbox: sent.sandbox };
      } catch (error) {
        if (uniqueViolation(error)) {
          const replay = await this.sms.sendSms(input.tenantId, {
            templateId: SMS_TEMPLATES.SIGN_LINK,
            phone: input.dest.value,
            persistOtp: false,
            maskStoredDest: true,
            params,
            source: { type: 'ESIGN_LINK', id: input.sourceId },
          });
          if (!replay.idempotentReplay || (replay.status !== 'SENT' && replay.status !== 'DELIVERED')) {
            throw new UnprocessableEntityException({ detail: 'e-sign link was not sent' });
          }
          return { deliveryId: replay.deliveryId, sandbox: replay.sandbox };
        }
        throw error;
      }
    }
    throw new UnprocessableEntityException({ detail: 'esign zalo is disabled' });
  }

  private async resolveDest(tenantId: string, bookingId: string) {
    const booking = await this.bookings.findOne({ where: { id: bookingId, tenantId } });
    if (!booking?.leadId) {
      throw new UnprocessableEntityException({ detail: 'signer channel destination is not registered' });
    }
    const lead = await this.leads.findOne({ where: { id: booking.leadId, tenantId } });
    if (!lead) {
      throw new UnprocessableEntityException({ detail: 'signer channel destination is not registered' });
    }
    const meta = (lead.channelMeta ?? {}) as { senderId?: string; channel?: string };
    const picked = pickRegisteredChannel({
      preferred: parseEsignChannel(this.config.get<string>(ESIGN_LINK_CHANNEL_ENV)),
      fallback: parseFallbackChannels(this.config.get<string>(ESIGN_LINK_FALLBACK_CHANNELS_ENV)),
      dest: {
        SMS: lead.phone,
        EMAIL: lead.email,
        ZALO: meta.channel === 'ZALO' ? meta.senderId : null,
      },
      znsOn: znsEnabled(this.config.get<string>(ESIGN_ZNS_ENABLED_ENV)),
    });
    if (!picked.ok) throw new UnprocessableEntityException({ detail: picked.detail });
    return picked.dest;
  }

  private async note(claims: ContractSignClaims, action: string, metadata: Record<string, unknown>): Promise<void> {
    await this.dataSource.getRepository(SignatureEventEntity).save({
      id: `sev_${randomBytes(8).toString('hex')}`,
      tenantId: claims.tenantId,
      requestId: claims.requestId,
      signerId: claims.signerId,
      action,
      ip: null,
      userAgent: null,
      occurredAt: new Date(),
      channel: claims.channel,
      metadata: safeSignatureMetadata(metadata),
    });
  }
}

function uniqueViolation(error: unknown): boolean {
  const row = error as QueryFailedError & { code?: string; driverError?: { code?: string } };
  return row?.code === '23505' || row?.driverError?.code === '23505';
}
