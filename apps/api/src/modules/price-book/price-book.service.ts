import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { PriceBookVersionEntity } from '../../database/entities/price-book-versions.entity';
import { QuoteEntity } from '../../database/entities/quotes.entity';
import { priceWindowsOverlap, quoteIsImmutable } from '../spec-target/spec-target.rules';

/** D04 unsigned: only the developer admin may open a window until the role matrix is signed. */
export const PRICE_BOOK_WRITER_ROLE = 'DEVELOPER_ADMIN';

export function assertPriceBookWriter(role: string | undefined): void {
  if (role !== PRICE_BOOK_WRITER_ROLE) {
    throw new ForbiddenException({ detail: 'price book changes require a developer admin' });
  }
}

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('hex')}`;
}

@Injectable()
export class PriceBookService {
  constructor(
    @InjectRepository(PriceBookVersionEntity)
    private readonly books: Repository<PriceBookVersionEntity>,
    @InjectRepository(QuoteEntity)
    private readonly quotes: Repository<QuoteEntity>,
  ) {}

  async openVersion(input: {
    tenantId: string;
    actorRole: string | undefined;
    projectId: string;
    versionNo: number;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    payload: Record<string, unknown>;
  }): Promise<PriceBookVersionEntity> {
    assertPriceBookWriter(input.actorRole);
    const projectId = input.projectId.trim();
    if (!projectId) {
      throw new UnprocessableEntityException({ detail: 'project is required' });
    }
    if (!Number.isInteger(input.versionNo) || input.versionNo < 1) {
      throw new UnprocessableEntityException({ detail: 'version number is invalid' });
    }
    if (Number.isNaN(input.effectiveFrom.getTime())) {
      throw new UnprocessableEntityException({ detail: 'effective from is invalid' });
    }
    const existing = await this.books.find({ where: { tenantId: input.tenantId, projectId } });
    const overlaps = existing.some(
      (row) =>
        row.effectiveFrom != null &&
        priceWindowsOverlap(
          { from: row.effectiveFrom, to: row.effectiveTo },
          { from: input.effectiveFrom, to: input.effectiveTo },
        ),
    );
    if (overlaps) {
      throw new ConflictException({ detail: 'price windows overlap' });
    }
    return this.books.save(
      this.books.create({
        id: newId('pbv'),
        tenantId: input.tenantId,
        projectId,
        versionNo: input.versionNo,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
        status: 'DRAFT',
        payload: input.payload ?? {},
      }),
    );
  }

  async changeQuoteStatus(input: {
    tenantId: string;
    actorRole: string | undefined;
    quoteId: string;
    nextStatus: string;
  }): Promise<QuoteEntity> {
    assertPriceBookWriter(input.actorRole);
    const nextStatus = input.nextStatus.trim();
    if (!nextStatus || nextStatus === 'ACCEPTED') {
      throw new UnprocessableEntityException({ detail: 'quote status change is not allowed' });
    }
    const quote = await this.quotes.findOne({
      where: { id: input.quoteId, tenantId: input.tenantId },
    });
    if (!quote) {
      throw new NotFoundException({ detail: 'quote not found' });
    }
    if (quoteIsImmutable(quote.status)) {
      throw new ConflictException({ detail: 'accepted quote is immutable' });
    }
    quote.status = nextStatus;
    return this.quotes.save(quote);
  }
}
