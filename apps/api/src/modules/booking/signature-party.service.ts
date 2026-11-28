import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SignatureRequestEntity } from '../../database/entities/signature-request.entity';
import { SignatureSignerEntity } from '../../database/entities/signature-signer.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { canSendSignLink } from '../identity/role-catalog';
import { BookingContractService } from './booking-contract.service';
import {
  CONTRACT_SIGN_TOKEN_TTL_MS,
  contractSignSecret,
  type ContractSignChannel,
} from './contract-sign-token';
import { buildSigningUrl, ESIGN_SIGNING_BASE_URL_ENV } from './esign-link.policy';
import { VOID_TICKET_JTI_SQL } from './esign-otp-atomic';
import { EsignLinkService } from './esign-link.service';
import {
  ESIGN_COMPLETION_COPY_CHANNEL_ENV,
  hashDocumentText,
  isPartyType,
  signerTurn,
  type PartyType,
  type SigningMode,
} from './esign-multi-party';
import { hashChannelDest, maskChannelDest, readEsignOtpPepper } from './esign-otp-policy';
import { SignatureTicketService } from './signature-ticket.service';
import { SignerChannelVerificationService } from './signer-channel-verification.service';

export type PartySignerInput = {
  partyType: string;
  subjectId: string;
  displayName?: string;
  title?: string;
  signOrder: number;
  groupId?: string | null;
  dest: string;
  channel: ContractSignChannel;
};

@Injectable()
export class SignaturePartyService {
  constructor(
    @InjectRepository(SignatureRequestEntity)
    private readonly requests: Repository<SignatureRequestEntity>,
    @InjectRepository(SignatureSignerEntity)
    private readonly signers: Repository<SignatureSignerEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly contracts: BookingContractService,
    private readonly tickets: SignatureTicketService,
    private readonly links: EsignLinkService,
    private readonly channels: SignerChannelVerificationService,
    private readonly config: ConfigService,
  ) {}

  async create(input: {
    tenantId: string;
    contractId: string;
    actorId: string;
    mode: SigningMode;
    signers: PartySignerInput[];
    requiresAdminReview?: boolean;
  }) {
    if (input.signers.length < 1) {
      throw new UnprocessableEntityException({ detail: 'at least one signer is required' });
    }
    for (const row of input.signers) {
      if (!isPartyType(row.partyType)) {
        throw new UnprocessableEntityException({ detail: 'party type is not supported' });
      }
    }
    const loaded = await this.contracts.getContract(input.tenantId, input.contractId);
    const mergedText = loaded.data.attributes.mergedText;
    const documentHash = hashDocumentText(mergedText);
    const request = await this.requests.save({
      id: `sreq_${randomBytes(8).toString('hex')}`,
      tenantId: input.tenantId,
      documentType: 'BOOKING_CONTRACT',
      templateId: loaded.data.attributes.templateId,
      sourceEntityType: 'BOOKING',
      sourceEntityId: loaded.data.attributes.bookingId,
      contractId: input.contractId,
      status: 'DRAFT',
      signingMode: input.mode,
      documentHash,
      signedPdfDocumentId: null,
      certificateDocumentId: null,
      expiresAt: new Date(Date.now() + CONTRACT_SIGN_TOKEN_TTL_MS),
      createdBy: input.actorId,
      requiresAdminReview: input.requiresAdminReview === true,
      reviewedBy: null,
      reviewedAt: null,
      reviewDecision: null,
      reviewNotes: null,
    });
    const pepper = readEsignOtpPepper((key) => this.config.get<string>(key));
    if (!pepper) {
      throw new UnprocessableEntityException({ detail: 'esign otp pepper is not configured' });
    }
    for (const row of input.signers) {
      await this.channels.assertVerified(input.tenantId, row.channel, row.dest);
      await this.signers.save({
        id: `ssgn_${randomBytes(8).toString('hex')}`,
        requestId: request.id,
        tenantId: input.tenantId,
        partyType: row.partyType as PartyType,
        subjectId: row.subjectId,
        displayName: row.displayName ?? null,
        title: row.title ?? null,
        channel: row.channel,
        channelDestHash: hashChannelDest(row.dest, pepper),
        channelDestMasked: maskChannelDest(row.dest),
        signOrder: row.signOrder,
        groupId: row.groupId ?? null,
        status: 'PENDING',
        jti: `jti_${randomBytes(8).toString('hex')}`,
        jtiConsumedAt: null,
        signedAt: null,
        consentAt: null,
        signatureRef: null,
      });
    }
    return this.view(request.id, input.tenantId);
  }

  async sendDue(tenantId: string, requestId: string, actorRole: string | undefined) {
    if (!canSendSignLink(actorRole)) {
      throw new ForbiddenException({ detail: 'forbidden' });
    }
    const request = await this.requests.findOne({ where: { id: requestId, tenantId } });
    if (!request) throw new NotFoundException({ detail: 'not found' });
    const loaded = await this.contracts.getContract(tenantId, request.contractId);
    const currentHash = hashDocumentText(loaded.data.attributes.mergedText);
    if (request.documentHash && request.documentHash !== currentHash) {
      throw new UnprocessableEntityException({ detail: 'document hash does not match the frozen copy' });
    }
    if (!request.documentHash) {
      request.documentHash = currentHash;
      await this.requests.save(request);
    }
    const roster = await this.signers.find({ where: { requestId, tenantId } });
    const secret = contractSignSecret((key) => this.config.get<string>(key));
    const baseUrl = this.config.get<string>(ESIGN_SIGNING_BASE_URL_ENV)?.trim();
    if (!secret || !baseUrl) {
      throw new UnprocessableEntityException({ detail: 'esign signing base url is not configured' });
    }
    const sent: string[] = [];
    for (const signer of roster) {
      const turn = signerTurn({
        mode: request.signingMode as SigningMode,
        signer,
        roster,
      });
      if (turn !== 'ok') continue;
      const destValue = await this.destFor(tenantId, request, signer);
      const runner = this.dataSource.createQueryRunner();
      await runner.connect();
      await runner.startTransaction();
      let minted: { token: string; claims: { jti: string; channel: ContractSignChannel } };
      let deliveryId = '';
      let url = '';
      const sourceId = `${request.contractId}:${signer.id}`;
      try {
        minted = await this.tickets.rotateTicket({
          tenantId,
          contractId: request.contractId,
          subjectId: signer.subjectId ?? signer.id,
          signer,
          secret,
          manager: runner.manager,
        });
        url = buildSigningUrl(baseUrl, {
          contractId: request.contractId,
          tenantId,
          token: minted.token,
        });
        const queued = await this.links.deliverSigningUrl({
          tenantId,
          dest: { channel: minted.claims.channel, value: destValue },
          buyerName: signer.displayName ?? loaded.data.attributes.mergeContext.buyerName,
          contractId: request.contractId,
          sourceId,
          signingUrl: url,
          manager: runner.manager,
          deferComplete: true,
        });
        deliveryId = queued.deliveryId;
        await runner.commitTransaction();
      } catch (error) {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        throw error;
      } finally {
        await runner.release();
      }
      try {
        await this.links.completeQueuedSigningUrl({
          tenantId,
          dest: { channel: minted.claims.channel, value: destValue },
          buyerName: signer.displayName ?? loaded.data.attributes.mergeContext.buyerName,
          contractId: request.contractId,
          sourceId,
          deliveryId,
          signingUrl: url,
        });
      } catch (error) {
        await this.dataSource.query(VOID_TICKET_JTI_SQL, [minted.claims.jti, tenantId]);
        throw error;
      }
      sent.push(signer.id);
    }
    if (sent.length === 0) {
      throw new UnprocessableEntityException({ detail: 'no signer is due for a signing link' });
    }
    request.status = 'SENT';
    await this.requests.save(request);
    return { data: { requestId, sentSignerIds: sent } };
  }

  async assertCanAct(tenantId: string, signerId: string, requestId: string): Promise<void> {
    const request = await this.requests.findOne({ where: { id: requestId, tenantId } });
    if (!request) throw new NotFoundException({ detail: 'not found' });
    const roster = await this.signers.find({ where: { requestId, tenantId } });
    const signer = roster.find((row) => row.id === signerId);
    if (!signer) throw new NotFoundException({ detail: 'not found' });
    const turn = signerTurn({ mode: request.signingMode as SigningMode, signer, roster });
    if (turn !== 'ok') {
      throw new UnprocessableEntityException({ detail: 'signer is not next in the signing order' });
    }
  }

  completionCopyChannel(): string | null {
    const raw = this.config.get<string>(ESIGN_COMPLETION_COPY_CHANNEL_ENV)?.trim() ?? '';
    return raw ? raw.toUpperCase() : null;
  }

  async view(requestId: string, tenantId: string) {
    const request = await this.requests.findOne({ where: { id: requestId, tenantId } });
    if (!request) throw new NotFoundException({ detail: 'not found' });
    const roster = await this.signers.find({ where: { requestId, tenantId } });
    return {
      data: {
        id: request.id,
        contractId: request.contractId,
        status: request.status,
        signingMode: request.signingMode,
        documentHash: request.documentHash,
        signedPdfDocumentId: request.signedPdfDocumentId,
        certificateDocumentId: request.certificateDocumentId,
        signers: roster.map((row) => ({
          id: row.id,
          partyType: row.partyType,
          signOrder: row.signOrder,
          groupId: row.groupId,
          status: row.status,
          destMasked: row.channelDestMasked,
          title: row.title,
        })),
      },
    };
  }

  private async destFor(
    tenantId: string,
    request: SignatureRequestEntity,
    signer: SignatureSignerEntity,
  ): Promise<string> {
    const pepper = readEsignOtpPepper((key) => this.config.get<string>(key));
    if (!pepper) {
      throw new UnprocessableEntityException({ detail: 'esign otp pepper is not configured' });
    }
    let value = '';
    if (signer.partyType === 'BUYER') {
      const booking = await this.bookings.findOne({ where: { id: request.sourceEntityId, tenantId } });
      const lead = booking?.leadId
        ? await this.leads.findOne({ where: { id: booking.leadId, tenantId } })
        : null;
      value = signer.channel === 'EMAIL' ? lead?.email?.trim() ?? '' : lead?.phone?.trim() ?? '';
    } else if (signer.channel === 'EMAIL') {
      const user = await this.users.findOne({ where: { id: signer.subjectId ?? '', tenantId } });
      value = user?.email?.trim() ?? '';
    } else {
      const user = await this.users.findOne({ where: { id: signer.subjectId ?? '', tenantId } });
      const match = /^seeker\+(\d+)@/i.exec(user?.email ?? '');
      value = match?.[1] ? `+84${match[1].replace(/^0/, '')}` : '';
    }
    if (!value) {
      throw new UnprocessableEntityException({ detail: 'signer channel destination is not registered' });
    }
    const channel = (signer.channel === 'EMAIL' ? 'EMAIL' : 'SMS') as ContractSignChannel;
    await this.channels.assertVerified(tenantId, channel, value);
    if (hashChannelDest(value, pepper) !== signer.channelDestHash) {
      throw new UnprocessableEntityException({ detail: 'signer channel is not verified' });
    }
    return value;
  }
}
