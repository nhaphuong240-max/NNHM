import { Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, EntityManager, QueryRunner, Repository } from 'typeorm';
import { SignatureEventEntity } from '../../database/entities/signature-event.entity';
import { SignatureRequestEntity } from '../../database/entities/signature-request.entity';
import { SignatureSignerEntity } from '../../database/entities/signature-signer.entity';
import {
  CONTRACT_SIGN_TOKEN_TTL_MS,
  mintContractSignToken,
  type ContractSignClaims,
} from './contract-sign-token';
import { CLAIM_TICKET_SQL, returnedRows } from './esign-otp-atomic';
import { safeSignatureMetadata } from './esign-otp-policy';
import { EsignOtpChallengeService } from './esign-otp-challenge.service';
import { ticketUse, type StoredSignTicket } from './signature-ticket.policy';

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

@Injectable()
export class SignatureTicketService {
  constructor(
    @InjectRepository(SignatureRequestEntity)
    private readonly requests: Repository<SignatureRequestEntity>,
    @InjectRepository(SignatureSignerEntity)
    private readonly signers: Repository<SignatureSignerEntity>,
    @InjectRepository(SignatureEventEntity)
    private readonly events: Repository<SignatureEventEntity>,
    @InjectDataSource()
    private readonly dataSource?: DataSource,
    private readonly challenges?: EsignOtpChallengeService,
  ) {}

  async issueBuyerAccess(input: {
    tenantId: string;
    contractId: string;
    buyerId: string;
    secret: string;
    bookingId?: string;
    now?: number;
    channel?: ContractSignClaims['channel'];
    channelDestHash?: string | null;
    channelDestMasked?: string | null;
    recordLinkSent?: boolean;
    manager?: EntityManager;
  }): Promise<{ token: string; claims: ContractSignClaims }> {
    const now = input.now ?? Date.now();
    const requestId = newId('sreq');
    const signerId = newId('ssgn');
    const jti = newId('jti');
    const channel = input.channel ?? 'SMS';
    const requests = input.manager?.getRepository(SignatureRequestEntity) ?? this.requests;
    const signers = input.manager?.getRepository(SignatureSignerEntity) ?? this.signers;
    const request = await requests.save(
      requests.create({
        id: requestId,
        tenantId: input.tenantId,
        documentType: 'BOOKING_CONTRACT',
        templateId: null,
        sourceEntityType: 'BOOKING',
        sourceEntityId: input.bookingId?.trim() || input.contractId,
        contractId: input.contractId,
        status: 'SENT',
        signingMode: 'SEQUENTIAL',
        documentHash: null,
        signedPdfDocumentId: null,
        certificateDocumentId: null,
        expiresAt: new Date(now + CONTRACT_SIGN_TOKEN_TTL_MS),
        createdBy: input.buyerId,
        requiresAdminReview: false,
        reviewedBy: null,
        reviewedAt: null,
        reviewDecision: null,
        reviewNotes: null,
      }),
    );
    const signer = await signers.save(
      signers.create({
        id: signerId,
        requestId: request.id,
        tenantId: input.tenantId,
        partyType: 'BUYER',
        subjectId: input.buyerId,
        displayName: null,
        title: null,
        channel,
        channelDestHash: input.channelDestHash ?? null,
        channelDestMasked: input.channelDestMasked ?? null,
        signOrder: 1,
        groupId: null,
        status: 'LINK_SENT',
        jti,
        jtiConsumedAt: null,
        signedAt: null,
        consentAt: null,
        signatureRef: null,
      }),
    );
    const token = mintContractSignToken({
      tenantId: input.tenantId,
      contractId: input.contractId,
      buyerId: input.buyerId,
      signerId: signer.id,
      requestId: request.id,
      jti: signer.jti,
      channel,
      secret: input.secret,
      now,
    });
    if (input.manager) {
      const events = input.manager.getRepository(SignatureEventEntity);
      await events.save(
        events.create({
          id: newId('sev'),
          tenantId: input.tenantId,
          requestId: request.id,
          signerId: signer.id,
          action: 'REQUEST_CREATED',
          ip: null,
          userAgent: null,
          occurredAt: new Date(now),
          channel,
          metadata: safeSignatureMetadata({}),
        }),
      );
    } else {
      await this.record(input.tenantId, request.id, signer.id, 'REQUEST_CREATED', channel, now);
      if (input.recordLinkSent !== false) {
        await this.record(input.tenantId, request.id, signer.id, 'LINK_SENT', channel, now);
      }
    }
    return {
      token,
      claims: {
        tenantId: input.tenantId,
        contractId: input.contractId,
        buyerId: input.buyerId,
        signerId: signer.id,
        requestId: request.id,
        jti: signer.jti,
        channel,
        exp: now + CONTRACT_SIGN_TOKEN_TTL_MS,
      },
    };
  }

  async assertUsable(claims: ContractSignClaims): Promise<void> {
    const decision = ticketUse(await this.load(claims), claims);
    if (decision === 'replay') {
      throw new UnauthorizedException({ detail: 'contract sign token was already used' });
    }
    if (decision !== 'ok') {
      throw new UnauthorizedException({
        detail: 'contract sign token is missing, expired, or for another contract',
      });
    }
  }

  async consume(claims: ContractSignClaims, now = Date.now()): Promise<void> {
    await this.assertUsable(claims);
    const claimed = returnedRows(
      await this.signers.query(CLAIM_TICKET_SQL, [claims.jti, claims.tenantId]),
    );
    if (claimed.length !== 1) {
      throw new UnauthorizedException({ detail: 'contract sign token was already used' });
    }
    await this.record(claims.tenantId, claims.requestId, claims.signerId, 'TOKEN_CONSUMED', claims.channel, now);
  }

  /**
   * A consumed ticket whose signer is SIGNED and whose vault file is still missing
   * can finish the upload. A finished ticket stays used.
   */
  async pendingVault(claims: ContractSignClaims): Promise<'pending' | 'used' | 'open'> {
    const signer = await this.signers.findOne({ where: { jti: claims.jti, tenantId: claims.tenantId } });
    if (!signer || signer.id !== claims.signerId || signer.requestId !== claims.requestId) return 'open';
    if (!signer.jtiConsumedAt) return 'open';
    if (signer.status !== 'SIGNED') return 'used';
    const request = await this.requests.findOne({ where: { id: signer.requestId, tenantId: signer.tenantId } });
    if (request?.signedPdfDocumentId) return 'used';
    return 'pending';
  }

  /**
   * Claim the ticket and write the signature rows in one transaction.
   * A wrong OTP commits the attempt and leaves the ticket unused.
   * A failure before commit rolls the claim, the OTP consume, and every signature write back.
   * The vault file is stored by afterCommit, after the database commit.
   */
  async completeSign<T, R = T>(
    claims: ContractSignClaims,
    otp: string,
    work: (manager: EntityManager) => Promise<T>,
    afterCommit?: (value: T) => Promise<R>,
  ): Promise<R> {
    if (!this.dataSource || !this.challenges) {
      throw new UnauthorizedException({ detail: 'sign access ticket is required' });
    }
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    let committed = false;
    try {
      const outcome = await this.challenges.takeAttempt(runner, claims, otp);
      if (outcome.kind === 'refused') {
        await runner.commitTransaction();
        committed = true;
        throw new UnprocessableEntityException({ detail: outcome.detail });
      }
      if (outcome.kind === 'lost') {
        throw new UnauthorizedException({ detail: 'contract sign token was already used' });
      }
      const claimed = returnedRows(await runner.query(CLAIM_TICKET_SQL, [claims.jti, claims.tenantId]));
      if (claimed.length !== 1) {
        throw new UnauthorizedException({ detail: 'contract sign token was already used' });
      }
      await this.recordOn(runner, claims, 'TOKEN_CONSUMED');
      const value = await work(runner.manager);
      await runner.commitTransaction();
      committed = true;
      if (!afterCommit) return value as unknown as R;
      return await afterCommit(value);
    } catch (error) {
      if (!committed) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  private async load(claims: ContractSignClaims): Promise<StoredSignTicket | null> {
    const signer = await this.signers.findOne({ where: { jti: claims.jti, tenantId: claims.tenantId } });
    if (!signer) return null;
    const request = await this.requests.findOne({ where: { id: signer.requestId, tenantId: signer.tenantId } });
    if (!request) return null;
    return {
      jti: signer.jti,
      tenantId: signer.tenantId,
      contractId: request.contractId,
      signerId: signer.id,
      requestId: request.id,
      channel: signer.channel,
      consumedAtMs: signer.jtiConsumedAt ? signer.jtiConsumedAt.getTime() : null,
    };
  }

  private async recordOn(runner: QueryRunner, claims: ContractSignClaims, action: string): Promise<void> {
    const repo = runner.manager.getRepository(SignatureEventEntity);
    await repo.save(
      repo.create({
        id: newId('sev'),
        tenantId: claims.tenantId,
        requestId: claims.requestId,
        signerId: claims.signerId,
        action,
        ip: null,
        userAgent: null,
        occurredAt: new Date(),
        channel: claims.channel,
        metadata: safeSignatureMetadata({ jti: claims.jti }),
      }),
    );
  }

  private async record(
    tenantId: string,
    requestId: string,
    signerId: string,
    action: string,
    channel: string,
    now: number,
  ): Promise<void> {
    await this.events.save(
      this.events.create({
        id: newId('sev'),
        tenantId,
        requestId,
        signerId,
        action,
        ip: null,
        userAgent: null,
        occurredAt: new Date(now),
        channel,
        metadata: safeSignatureMetadata({}),
      }),
    );
  }
}
