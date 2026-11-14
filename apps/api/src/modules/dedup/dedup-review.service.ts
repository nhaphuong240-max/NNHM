import { createHash } from 'crypto';
import { randomBytes } from 'crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerEntity } from '../../database/entities/customers.entity';
import { DedupReviewEntity } from '../../database/entities/dedup-reviews.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { normalizePhone } from '../crm/phone.util';

/** D05 unsigned: a person must mark the pair distinct. This path never merges or assigns. */
export const DEDUP_REVIEWER_ROLES = ['OPS_ADMIN', 'DEVELOPER_ADMIN'] as const;

export function phoneHash(phone: string): string | null {
  const digits = normalizePhone(phone);
  if (digits.length < 9) return null;
  return createHash('sha256').update(digits).digest('hex');
}

@Injectable()
export class DedupReviewService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customers: Repository<CustomerEntity>,
    @InjectRepository(DedupReviewEntity)
    private readonly reviews: Repository<DedupReviewEntity>,
  ) {}

  async enqueue(input: { tenantId: string; leadId: string }): Promise<{
    queued: boolean;
    reviewIds: string[];
    assignedTo: string | null;
  }> {
    const lead = await this.leads.findOne({ where: { id: input.leadId, tenantId: input.tenantId } });
    if (!lead) throw new NotFoundException({ detail: 'lead not found' });
    const hash = phoneHash(lead.phone);
    if (!hash) {
      return { queued: false, reviewIds: [], assignedTo: lead.assignedTo ?? null };
    }
    const matches = await this.customers.find({ where: { tenantId: input.tenantId, phoneHash: hash } });
    const reviewIds: string[] = [];
    for (const customer of matches) {
      const existing = await this.reviews.findOne({
        where: { tenantId: input.tenantId, customerId: customer.id, leadId: lead.id },
      });
      if (existing) {
        reviewIds.push(existing.id);
        continue;
      }
      const created = await this.reviews.save(
        this.reviews.create({
          id: `ddr_${randomBytes(12).toString('hex')}`,
          tenantId: input.tenantId,
          customerId: customer.id,
          leadId: lead.id,
          status: 'PENDING',
          payload: { needsHumanApproval: true },
        }),
      );
      reviewIds.push(created.id);
    }
    return {
      queued: reviewIds.length > 0,
      reviewIds,
      assignedTo: lead.assignedTo ?? null,
    };
  }

  async markDistinct(input: {
    tenantId: string;
    reviewId: string;
    actorRole: string | undefined;
  }): Promise<DedupReviewEntity> {
    if (!input.actorRole || !DEDUP_REVIEWER_ROLES.includes(input.actorRole as (typeof DEDUP_REVIEWER_ROLES)[number])) {
      throw new ForbiddenException({ detail: 'dedup review requires an operator' });
    }
    const review = await this.reviews.findOne({
      where: { id: input.reviewId, tenantId: input.tenantId },
    });
    if (!review) throw new NotFoundException({ detail: 'dedup review not found' });
    if (review.status !== 'PENDING') {
      throw new ConflictException({ detail: 'dedup review is not pending' });
    }
    review.status = 'DISTINCT';
    const saved = await this.reviews.save(review);
    if ('phone' in saved.payload || 'assignedTo' in saved.payload) {
      throw new UnprocessableEntityException({ detail: 'dedup review must not carry customer data' });
    }
    return saved;
  }
}
