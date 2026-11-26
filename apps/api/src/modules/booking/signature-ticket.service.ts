import { Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, QueryRunner, Repository } from 'typeorm';
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
  }): Promise<{ token: string; claims: ContractSignClaims }> {
    const now = input.now ?? Date.now();
    const requestId = newId('sreq');
    const signerId = newId('ssgn');
    const jti = newId('jti');
    const request = await this.requests.save(
      this.requests.create({
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
    const signer = await this.signers.save(
      this.signers.create({
        id: signerId,
        requestId: request.id,
        tenantId: input.tenantId,
        partyType: 'BUYER',
        subjectId: input.buyerId,
        displayName: null,
        title: null,
        channel: 'SMS',
        channelDestHash: null,
        channelDestMasked: null,
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
      channel: 'SMS',
      secret: input.secret,
      now,
    });
    await this.record(input.tenantId, request.id, signer.id, 'REQUEST_CREATED', 'SMS', now);
    await this.record(input.tenantId, request.id, signer.id, 'LINK_SENT', 'SMS', now);
    return {
      token,
      claims: {
        tenantId: input.tenantId,
        contractId: input.contractId,
        buyerId: input.buyerId,
        signerId: signer.id,
        requestId: request.id,
        jti: signer.jti,
        channel: 'SMS',
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
   * Claim the ticket and sign in one transaction.
   * A wrong OTP commits the attempt and leaves the ticket unused.
   * A signing failure rolls the claim and the OTP consume back.
   */
  async completeSign<T>(claims: ContractSignClaims, otp: string, work: () => Promise<T>): Promise<T> {
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
      const value = await work();
      await runner.commitTransaction();
      committed = true;
      return value;
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
