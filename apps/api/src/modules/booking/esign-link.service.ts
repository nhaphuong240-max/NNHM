import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { SignatureRequestEntity } from '../../database/entities/signature-request.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SignatureEventEntity } from '../../database/entities/signature-event.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { normalizePhone } from '../crm/phone.util';
import { EmailService } from '../email/email.service';
import { EMAIL_TEMPLATES } from '../email/email.types';
import { SmsService } from '../sms/sms.service';
import { SMS_TEMPLATES } from '../sms/sms.types';
import {
  CONTRACT_SIGN_TOKEN_TTL_MS,
  contractSignSecret,
  type ContractSignChannel,
  type ContractSignClaims,
} from './contract-sign-token';
import {
  ADVISORY_LOCK_SQL,
  esignLinkSourceArgs,
  LATEST_LINK_SQL,
  markQueuedDeliveryFailedSql,
  returnedRows,
  VOID_OPEN_TICKETS_SQL,
  VOID_TICKET_JTI_SQL,
} from './esign-otp-atomic';
import { EsignOtpChallengeService } from './esign-otp-challenge.service';
import {
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
import { SandboxEsignOutbox } from './sandbox-esign-outbox';
import { SignatureTicketService } from './signature-ticket.service';
import { SignerChannelVerificationService } from './signer-channel-verification.service';
import { hashDocumentText } from './esign-multi-party';

export type SendSignLinkInput = {
  tenantId: string;
  contractId: string;
  bookingId: string;
  buyerName: string;
  documentText?: string;
  resend?: boolean;
  actor?: { userId: string; role: string };
};

export type SendSignLinkResult = {
  sent: boolean;
  /** QUEUED still inside TTL. Owner has not signed whether clients treat this as 422. */
  sending?: boolean;
  channel: ContractSignChannel;
  destMasked: string;
  deliveryId: string;
  sandbox: boolean;
  idempotentReplay?: boolean;
};

type LatestLink = {
  created_at: string | Date;
  status: string;
  source_id: string;
  id: string;
  channel: string;
};

@Injectable()
export class EsignLinkService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly tickets: SignatureTicketService,
    private readonly challenges: EsignOtpChallengeService,
    private readonly email: EmailService,
    private readonly sms: SmsService,
    private readonly outbox: SandboxEsignOutbox,
    private readonly channels: SignerChannelVerificationService,
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
    const nodeEnv = this.config.get<string>('NODE_ENV');
    if (nodeEnv !== 'development' && nodeEnv !== 'test' && !baseUrl.toLowerCase().startsWith('https://')) {
      throw new UnprocessableEntityException({ detail: 'esign signing base url must be https' });
    }
    const dest = await this.resolveDest(input.tenantId, input.bookingId);
    const booking = await this.bookings.findOne({ where: { id: input.bookingId, tenantId: input.tenantId } });
    await this.channels.assertVerified(input.tenantId, dest.channel, dest.value, booking?.leadId ?? undefined);
    const buyerId = await this.buyerSubjectFromBooking(input.tenantId, input.bookingId);
    await this.assertChannelReady(input.tenantId, dest.channel);
    const prefix = `${input.contractId}:${buyerId}`;
    const lockKey = `esign-link:${input.tenantId}:${prefix}`;
    const [exact, like] = esignLinkSourceArgs(prefix);
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(ADVISORY_LOCK_SQL, [lockKey]);
      const latest = returnedRows(await runner.query(LATEST_LINK_SQL, [input.tenantId, exact, like]))[0] as
        | LatestLink
        | undefined;

      if (!input.resend && latest && ['SENT', 'DELIVERED', 'QUEUED'].includes(latest.status)) {
        const age = Date.now() - new Date(latest.created_at).getTime();
        if (age > CONTRACT_SIGN_TOKEN_TTL_MS) {
          if (latest.status === 'QUEUED') {
            await runner.query(markQueuedDeliveryFailedSql(latest.channel), [latest.id, input.tenantId]);
            await runner.commitTransaction();
          }
          throw new UnprocessableEntityException({ detail: 'esign link already exists; resend is required' });
        }
        await runner.commitTransaction();
        const sending = latest.status === 'QUEUED';
        return {
          sent: !sending,
          sending: sending || undefined,
          channel: dest.channel,
          destMasked: maskChannelDest(dest.value),
          deliveryId: latest.id,
          sandbox: await this.channelSandbox(input.tenantId, dest.channel),
          idempotentReplay: true,
        };
      }
      if (!input.resend && latest) {
        throw new UnprocessableEntityException({ detail: 'esign link already exists; resend is required' });
      }

      await this.challenges.assertSendBudget({
        tenantId: input.tenantId,
        contractId: input.contractId,
        buyerId,
      } as ContractSignClaims);

      if (input.resend) {
        if (!latest) throw new UnprocessableEntityException({ detail: 'esign link has not been sent' });
        const cooldown = readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_OTP_RESEND_COOLDOWN_ENV);
        if (cooldown === null) {
          throw new UnprocessableEntityException({ detail: 'esign otp resend cooldown is not configured' });
        }
        if (Date.now() < new Date(latest.created_at).getTime() + cooldown * 1000) {
          throw new UnprocessableEntityException({ detail: 'esign otp resend is cooling down' });
        }
        await runner.query(VOID_OPEN_TICKETS_SQL, [input.tenantId, input.contractId, buyerId]);
      }

      const pepper = readEsignOtpPepper((key) => this.config.get<string>(key));
      if (!pepper) {
        throw new UnprocessableEntityException({ detail: 'esign otp pepper is not configured' });
      }
      const sourceId = input.resend ? `${prefix}:${randomBytes(4).toString('hex')}` : prefix;
      if (input.documentText) {
        const frozen = hashDocumentText(input.documentText);
        const open = await runner.manager.getRepository(SignatureRequestEntity).findOne({
          where: { tenantId: input.tenantId, contractId: input.contractId },
          order: { createdAt: 'DESC' },
        });
        if (open?.documentHash && open.documentHash !== frozen) {
          throw new UnprocessableEntityException({ detail: 'document hash does not match the frozen copy' });
        }
      }
      const minted = await this.tickets.issueBuyerAccess({
        tenantId: input.tenantId,
        contractId: input.contractId,
        buyerId,
        secret,
        bookingId: input.bookingId,
        channel: dest.channel,
        channelDestHash: hashChannelDest(dest.value, pepper),
        channelDestMasked: maskChannelDest(dest.value),
        recordLinkSent: false,
        manager: runner.manager,
        documentHash: input.documentText ? hashDocumentText(input.documentText) : null,
      });
      const queued = await this.enqueueLink({
        tenantId: input.tenantId,
        dest,
        buyerName: input.buyerName,
        contractId: input.contractId,
        sourceId,
        manager: runner.manager,
      });
      const signingUrl = buildSigningUrl(baseUrl, {
        contractId: input.contractId,
        tenantId: input.tenantId,
        token: minted.token,
      });
      this.outbox.put(queued.deliveryId, signingUrl);
      await runner.commitTransaction();
      try {
        const delivery = await this.completeLink({
          tenantId: input.tenantId,
          dest,
          buyerName: input.buyerName,
          contractId: input.contractId,
          sourceId,
          deliveryId: queued.deliveryId,
          signingUrl,
        });
        this.outbox.put(delivery.deliveryId, signingUrl);
        await this.note(minted.claims, input.resend ? 'LINK_RESENT' : 'LINK_SENT', {
          deliveryId: delivery.deliveryId,
          actorId: input.actor?.userId,
          role: input.actor?.role,
        });
        return {
          sent: true,
          channel: dest.channel,
          destMasked: maskChannelDest(dest.value),
          deliveryId: delivery.deliveryId,
          sandbox: delivery.sandbox,
        };
      } catch (error) {
        await this.dataSource.query(VOID_TICKET_JTI_SQL, [minted.claims.jti, input.tenantId]);
        await this.note(minted.claims, 'LINK_FAILED', {
          actorId: input.actor?.userId,
          role: input.actor?.role,
        });
        if (error instanceof UnprocessableEntityException) throw error;
        throw new UnprocessableEntityException({ detail: 'e-sign link send failed' });
      }
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  private async assertChannelReady(
    tenantId: string,
    channel: ContractSignChannel,
    emailTemplate: string = EMAIL_TEMPLATES.SIGN_LINK,
  ): Promise<void> {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      if (channel === 'EMAIL' && this.email.isSandbox()) {
        throw new UnprocessableEntityException({ detail: 'email sandbox is not allowed in production' });
      }
      if (channel === 'SMS' && (await this.sms.isSandbox(tenantId))) {
        throw new UnprocessableEntityException({ detail: 'sms sandbox is not allowed in production' });
      }
    }
    if (channel === 'EMAIL') this.email.assertReady(emailTemplate);
    if (channel === 'SMS') await this.sms.assertEsignReady(tenantId);
    if (channel === 'ZALO') {
      throw new UnprocessableEntityException({
        detail: znsEnabled(this.config.get<string>(ESIGN_ZNS_ENABLED_ENV))
          ? 'esign zalo is not implemented'
          : 'esign zalo is disabled',
      });
    }
  }

  async deliverCompletionCopy(input: {
    tenantId: string;
    dest: { channel: ContractSignChannel; value: string };
    buyerName: string;
    contractId: string;
    documentId: string;
    signerId: string;
    downloadUrl: string;
  }): Promise<void> {
    const sourceId = `ESIGN_COMPLETION:${input.contractId}:${input.signerId}`;
    const templateId = input.dest.channel === 'EMAIL' ? EMAIL_TEMPLATES.COMPLETION : SMS_TEMPLATES.COMPLETION;
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    let deliveryId = '';
    try {
      await this.assertChannelReady(input.tenantId, input.dest.channel, templateId);
      const queued = await this.enqueueLink({
        tenantId: input.tenantId,
        dest: input.dest,
        buyerName: input.buyerName,
        contractId: input.contractId,
        sourceId,
        manager: runner.manager,
        templateId,
        sourceType: 'ESIGN_COMPLETION',
        extraParams: { documentUrl: input.downloadUrl },
      });
      deliveryId = queued.deliveryId;
      await runner.commitTransaction();
    } catch {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      if (deliveryId) {
        if (input.dest.channel === 'SMS') await this.sms.markFailed(input.tenantId, deliveryId);
        else await this.email.markFailed(input.tenantId, deliveryId);
      }
      return;
    } finally {
      await runner.release();
    }
    try {
      await this.completeLink({
        tenantId: input.tenantId,
        dest: input.dest,
        buyerName: input.buyerName,
        contractId: input.contractId,
        sourceId,
        deliveryId,
        signingUrl: input.downloadUrl,
        templateId,
        sourceType: 'ESIGN_COMPLETION',
        extraParams: { documentUrl: input.downloadUrl },
      });
    } catch {
      if (input.dest.channel === 'SMS') await this.sms.markFailed(input.tenantId, deliveryId);
      else await this.email.markFailed(input.tenantId, deliveryId);
    }
  }

  async deliverSigningUrl(input: {
    tenantId: string;
    dest: { channel: ContractSignChannel; value: string };
    buyerName: string;
    contractId: string;
    sourceId: string;
    signingUrl: string;
    manager: import('typeorm').EntityManager;
    deferComplete?: boolean;
  }): Promise<{ deliveryId: string; sandbox: boolean }> {
    await this.assertChannelReady(input.tenantId, input.dest.channel);
    const queued = await this.enqueueLink(input);
    this.outbox.put(queued.deliveryId, input.signingUrl);
    if (input.deferComplete) {
      return { deliveryId: queued.deliveryId, sandbox: false };
    }
    const delivery = await this.completeLink({ ...input, deliveryId: queued.deliveryId });
    this.outbox.put(delivery.deliveryId, input.signingUrl);
    return { deliveryId: delivery.deliveryId, sandbox: delivery.sandbox };
  }

  async completeQueuedSigningUrl(input: {
    tenantId: string;
    dest: { channel: ContractSignChannel; value: string };
    buyerName: string;
    contractId: string;
    sourceId: string;
    deliveryId: string;
    signingUrl: string;
  }): Promise<{ deliveryId: string; sandbox: boolean }> {
    const delivery = await this.completeLink(input);
    this.outbox.put(delivery.deliveryId, input.signingUrl);
    return { deliveryId: delivery.deliveryId, sandbox: delivery.sandbox };
  }

  private async enqueueLink(input: {
    tenantId: string;
    dest: { channel: ContractSignChannel; value: string };
    buyerName: string;
    contractId: string;
    sourceId: string;
    manager: import('typeorm').EntityManager;
    templateId?: string;
    sourceType?: 'ESIGN_LINK' | 'ESIGN_COMPLETION';
    extraParams?: Record<string, string>;
  }): Promise<{ deliveryId: string }> {
    const params = { buyer_name: input.buyerName, contract_id: input.contractId, ...(input.extraParams ?? {}) };
    const sourceType = input.sourceType ?? 'ESIGN_LINK';
    if (input.dest.channel === 'EMAIL') {
      const queued = await this.email.send(
        input.tenantId,
        {
          to: input.dest.value,
          templateId: input.templateId ?? EMAIL_TEMPLATES.SIGN_LINK,
          params,
          source: { type: sourceType, id: input.sourceId },
          persistOtp: false,
        },
        input.manager,
      );
      return { deliveryId: queued.deliveryId };
    }
    if (input.dest.channel === 'SMS') {
      const queued = await this.sms.enqueueEsignLink(
        input.tenantId,
        {
          templateId: input.templateId ?? SMS_TEMPLATES.SIGN_LINK,
          phone: input.dest.value,
          persistOtp: false,
          maskStoredDest: true,
          params,
          source: { type: sourceType, id: input.sourceId },
        },
        input.manager,
      );
      return { deliveryId: queued.deliveryId };
    }
    throw new UnprocessableEntityException({ detail: 'esign zalo is not implemented' });
  }

  private async completeLink(input: {
    tenantId: string;
    dest: { channel: ContractSignChannel; value: string };
    buyerName: string;
    contractId: string;
    sourceId: string;
    deliveryId: string;
    signingUrl: string;
    templateId?: string;
    sourceType?: 'ESIGN_LINK' | 'ESIGN_COMPLETION';
    extraParams?: Record<string, string>;
  }): Promise<{ deliveryId: string; sandbox: boolean; idempotentReplay?: boolean }> {
    const params = { buyer_name: input.buyerName, contract_id: input.contractId, ...(input.extraParams ?? {}) };
    const sourceType = input.sourceType ?? 'ESIGN_LINK';
    try {
      if (input.dest.channel === 'EMAIL') {
        const sent = await this.email.completeQueued(input.tenantId, input.deliveryId, {
          to: input.dest.value,
          templateId: input.templateId ?? EMAIL_TEMPLATES.SIGN_LINK,
          params: input.signingUrl && sourceType === 'ESIGN_LINK'
            ? { ...params, signingUrl: input.signingUrl }
            : params,
          source: { type: sourceType, id: input.sourceId },
          persistOtp: false,
        });
        if (sent.status !== 'SENT') {
          throw new UnprocessableEntityException({ detail: 'e-sign link was not sent' });
        }
        return { deliveryId: sent.deliveryId, sandbox: sent.sandbox };
      }
      if (input.dest.channel === 'SMS') {
        const sent = await this.sms.completeEsignLink(input.tenantId, input.deliveryId, {
          templateId: input.templateId ?? SMS_TEMPLATES.SIGN_LINK,
          phone: input.dest.value,
          persistOtp: false,
          maskStoredDest: true,
          params: input.signingUrl && sourceType === 'ESIGN_LINK'
            ? { ...params, signingUrl: input.signingUrl }
            : params,
          source: { type: sourceType, id: input.sourceId },
        });
        if (sent.status !== 'SENT' && sent.status !== 'DELIVERED') {
          throw new UnprocessableEntityException({ detail: 'e-sign link was not sent' });
        }
        return { deliveryId: sent.deliveryId, sandbox: sent.sandbox, idempotentReplay: sent.idempotentReplay };
      }
      throw new UnprocessableEntityException({ detail: 'esign zalo is not implemented' });
    } catch (error) {
      if (uniqueViolation(error)) {
        const existing =
          input.dest.channel === 'EMAIL'
            ? await this.email.findBySource(input.tenantId, { type: sourceType, id: input.sourceId })
            : await this.sms.findBySource(input.tenantId, { type: sourceType, id: input.sourceId });
        if (!existing || (existing.status !== 'SENT' && existing.status !== 'DELIVERED')) {
          throw new UnprocessableEntityException({ detail: 'e-sign link was not sent' });
        }
        return {
          deliveryId: existing.id,
          sandbox: await this.channelSandbox(input.tenantId, input.dest.channel),
          idempotentReplay: true,
        };
      }
      throw error;
    }
  }

  private async buyerSubjectFromBooking(tenantId: string, bookingId: string): Promise<string> {
    const booking = await this.bookings.findOne({ where: { id: bookingId, tenantId } });
    if (!booking?.leadId) {
      throw new UnprocessableEntityException({ detail: 'signer channel destination is not registered' });
    }
    const lead = await this.leads.findOne({ where: { id: booking.leadId, tenantId } });
    if (!lead?.phone) {
      throw new UnprocessableEntityException({ detail: 'signer channel destination is not registered' });
    }
    const email = `seeker+${normalizePhone(lead.phone)}@nnhn.local`;
    const user = await this.users.findOne({ where: { tenantId, email } });
    if (!user) {
      throw new UnprocessableEntityException({ detail: 'signer buyer is not registered' });
    }
    return user.id;
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

  private async channelSandbox(tenantId: string, channel: ContractSignChannel): Promise<boolean> {
    if (channel === 'EMAIL') return this.email.isSandbox();
    if (channel === 'SMS') return this.sms.isSandbox(tenantId);
    return false;
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
