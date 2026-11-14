import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { RefundEntity } from '../../database/entities/refund.entity';
import { AuditService } from '../audit/audit.service';
import { refundWithinNet } from '../spec-target/spec-target.rules';

const REFUND_CHECK_ROLES = ['FINANCE_ADMIN', 'OPS_ADMIN'] as const;

function assertRefundChecker(role: string | undefined): void {
  if (!role || !REFUND_CHECK_ROLES.includes(role as (typeof REFUND_CHECK_ROLES)[number])) {
    throw new ForbiddenException({ detail: 'refund check requires a finance operator' });
  }
}

@Injectable()
export class RefundCheckService {
  constructor(
    @InjectRepository(PaymentIntentEntity)
    private readonly intents: Repository<PaymentIntentEntity>,
    @InjectRepository(RefundEntity)
    private readonly refunds: Repository<RefundEntity>,
    @InjectRepository(AuditEventEntity)
    private readonly events: Repository<AuditEventEntity>,
    private readonly audit: AuditService,
  ) {}

  async propose(input: {
    tenantId: string;
    actorId: string;
    actorRole: string | undefined;
    paymentIntentId: string;
    amount: number;
    currency?: string;
  }): Promise<{ status: 'PROPOSED'; amount: number; currency: string; paid: false }> {
    assertRefundChecker(input.actorRole);
    const intent = await this.loadIntent(input.tenantId, input.paymentIntentId);
    this.assertCurrency(intent.currency, input.currency);
    const alreadyRefunded = await this.refundedTotal(input.tenantId, intent.id);
    const collected = Number(intent.amount);
    if (!refundWithinNet(collected, alreadyRefunded, input.amount)) {
      throw new UnprocessableEntityException({ detail: 'refund exceeds the amount still collected' });
    }
    await this.audit.append({
      tenantId: input.tenantId,
      entityType: 'payment_intent',
      entityId: intent.id,
      action: 'REFUND_PROPOSED',
      actorId: input.actorId,
      payload: { amount: input.amount, collected, alreadyRefunded, currency: intent.currency },
    });
    return { status: 'PROPOSED', amount: input.amount, currency: intent.currency, paid: false };
  }

  async approve(input: {
    tenantId: string;
    actorId: string;
    actorRole: string | undefined;
    paymentIntentId: string;
  }): Promise<{ status: 'CHECKED'; amount: number; currency: string; paid: false }> {
    assertRefundChecker(input.actorRole);
    const intent = await this.loadIntent(input.tenantId, input.paymentIntentId);
    const proposal = await this.events.findOne({
      where: { tenantId: input.tenantId, entityType: 'payment_intent', entityId: intent.id, action: 'REFUND_PROPOSED' },
      order: { createdAt: 'DESC' },
    });
    if (!proposal || proposal.actorId == null) {
      throw new NotFoundException({ detail: 'refund proposal not found' });
    }
    if (proposal.actorId === input.actorId) {
      throw new ForbiddenException({ detail: 'the proposer cannot approve the refund' });
    }
    const checked = await this.events.findOne({
      where: { tenantId: input.tenantId, entityType: 'payment_intent', entityId: intent.id, action: 'REFUND_CHECKED' },
    });
    if (checked) {
      throw new ConflictException({ detail: 'refund check is already approved' });
    }
    const amount = Number(proposal.payload?.amount);
    const alreadyRefunded = await this.refundedTotal(input.tenantId, intent.id);
    if (!refundWithinNet(Number(intent.amount), alreadyRefunded, amount)) {
      throw new UnprocessableEntityException({ detail: 'refund exceeds the amount still collected' });
    }
    await this.audit.append({
      tenantId: input.tenantId,
      entityType: 'payment_intent',
      entityId: intent.id,
      action: 'REFUND_CHECKED',
      actorId: input.actorId,
      payload: { amount, currency: intent.currency, proposedBy: proposal.actorId, paid: false },
    });
    return { status: 'CHECKED', amount, currency: intent.currency, paid: false };
  }

  private async loadIntent(tenantId: string, paymentIntentId: string): Promise<PaymentIntentEntity> {
    const intent = await this.intents.findOne({ where: { id: paymentIntentId, tenantId } });
    if (!intent) throw new NotFoundException({ detail: 'payment intent not found' });
    return intent;
  }

  private assertCurrency(serverCurrency: string, requested?: string): void {
    if (requested && requested.trim().toUpperCase() !== serverCurrency.trim().toUpperCase()) {
      throw new UnprocessableEntityException({ detail: 'refund currency must match the payment intent' });
    }
  }

  private async refundedTotal(tenantId: string, paymentIntentId: string): Promise<number> {
    const rows = await this.refunds.find({
      where: { tenantId, paymentIntentId, status: 'SUCCEEDED' },
    });
    return rows.reduce((sum, row) => sum + Number(row.amount), 0);
  }
}
