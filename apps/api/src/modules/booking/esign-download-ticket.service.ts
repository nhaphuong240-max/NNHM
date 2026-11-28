import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { EsignDownloadTicketEntity } from '../../database/entities/esign-download-ticket.entity';
import { DocumentsService } from '../documents/documents.service';
import { ESIGN_SIGNING_BASE_URL_ENV } from './esign-link.policy';
import { ESIGN_DOWNLOAD_TTL_MS_ENV } from './esign-multi-party';
import { readConfiguredPositiveInt } from './esign-otp-policy';

export const CONSUME_DOWNLOAD_TICKET_SQL = `
UPDATE "esign_download_tickets"
SET "consumed_at" = now()
WHERE "ticket_hash" = $1 AND "tenant_id" = $2
  AND "consumed_at" IS NULL
  AND "expires_at" > now()
RETURNING "id", "document_id", "signer_id"
`;

export function hashDownloadTicket(ticket: string): string {
  return createHash('sha256').update(ticket, 'utf8').digest('hex');
}

@Injectable()
export class EsignDownloadTicketService {
  constructor(
    @InjectRepository(EsignDownloadTicketEntity)
    private readonly tickets: Repository<EsignDownloadTicketEntity>,
    private readonly documents: DocumentsService,
    private readonly config: ConfigService,
  ) {}

  async issuePublicUrl(input: {
    tenantId: string;
    documentId: string;
    signerId: string;
    contractId: string;
  }): Promise<string | null> {
    const ttlMs = readConfiguredPositiveInt((key) => this.config.get<string>(key), ESIGN_DOWNLOAD_TTL_MS_ENV);
    if (ttlMs === null) return null;
    const origin = publicApiOrigin(this.config.get<string>(ESIGN_SIGNING_BASE_URL_ENV));
    if (!origin) return null;
    const ticket = randomBytes(32).toString('hex');
    const id = `edt_${randomBytes(8).toString('hex')}`;
    await this.tickets.save({
      id,
      tenantId: input.tenantId,
      ticketHash: hashDownloadTicket(ticket),
      documentId: input.documentId,
      signerId: input.signerId,
      contractId: input.contractId,
      expiresAt: new Date(Date.now() + ttlMs),
      consumedAt: null,
    });
    return `${origin}/api/v1/esign-downloads/${ticket}`;
  }

  async open(tenantId: string | undefined, ticket: string) {
    const scoped = tenantId?.trim() ?? '';
    if (!scoped || !/^[0-9a-f]{64}$/.test(ticket)) {
      throw new NotFoundException({ detail: 'not found' });
    }
    const ticketHash = hashDownloadTicket(ticket);
    const claimed = await this.tickets.manager.query(CONSUME_DOWNLOAD_TICKET_SQL, [ticketHash, scoped]);
    const row = Array.isArray(claimed) ? claimed[0] : claimed;
    const documentId = (row as { document_id?: string } | undefined)?.document_id;
    if (documentId) {
      return this.documents.openDownloadStream(scoped, documentId);
    }
    const existing = await this.tickets.findOne({ where: { tenantId: scoped, ticketHash } });
    if (!existing) {
      throw new NotFoundException({ detail: 'not found' });
    }
    throw new HttpException({ detail: 'gone' }, HttpStatus.GONE);
  }
}

function publicApiOrigin(raw: string | undefined): string | null {
  const value = raw?.trim() ?? '';
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
