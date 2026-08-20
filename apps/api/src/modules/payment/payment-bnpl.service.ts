import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BnplApplicationEntity } from '../../database/entities/bnpl-application.entity';
import { BnplInstallmentEntity } from '../../database/entities/bnpl-installment.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { AuditService } from '../audit/audit.service';
import { BnplPartnerClient } from './bnpl-partner.client';
import {
  BNPL_PLANS,
  buildBnplInstallments,
  type BnplApplication,
} from './payment-bnpl.util';

function mapEntityToDto(
  row: BnplApplicationEntity,
  installments: BnplInstallmentEntity[],
): BnplApplication {
  return {
    id: row.id,
    bookingId: row.bookingId,
    planLabel: row.planLabel,
    totalAmount: Number(row.totalAmount),
    installmentCount: row.installmentCount,
    status: row.status,
    externalId: row.externalId ?? undefined,
    partnerReason: row.partnerReason ?? undefined,
    installments: installments.map((ins) => ({
      id: ins.id,
      dueDate: ins.dueDate,
      amount: Number(ins.amount),
      status: ins.status,
      paidAt: ins.paidAt?.toISOString(),
    })),
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class PaymentBnplService {
  constructor(
    @InjectRepository(BnplApplicationEntity)
    private readonly applications: Repository<BnplApplicationEntity>,
    @InjectRepository(BnplInstallmentEntity)
    private readonly installments: Repository<BnplInstallmentEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    private readonly audit: AuditService,
    private readonly partner: BnplPartnerClient,
  ) {}

  listPlans() {
    return {
      data: BNPL_PLANS,
      meta: { uc: ['UC-PAY-07'], screen: 'SCR-BUYER-001' },
    };
  }

  async listApplications(tenantId: string) {
    const rows = await this.applications.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 40,
    });
    const apps: BnplApplication[] = [];
    for (const row of rows) {
      const ins = await this.installments.find({
        where: { tenantId, applicationId: row.id },
        order: { dueDate: 'ASC' },
      });
      apps.push(mapEntityToDto(row, ins));
    }
    return {
      data: apps,
      meta: { tenantId, count: apps.length, uc: ['UC-PAY-07'], screen: 'SCR-BUYER-001' },
    };
  }

  async apply(
    tenantId: string,
    input: { bookingId: string; planId: string },
    actorId?: string,
  ) {
    const booking = await this.bookings.findOne({
      where: { id: input.bookingId.trim(), tenantId },
    });
    if (!booking) {
      throw new NotFoundException({ detail: `Booking ${input.bookingId} not found` });
    }

    const plan = BNPL_PLANS.find((p) => p.id === input.planId.trim()) ?? BNPL_PLANS[0]!;
    const totalAmount = Number(booking.depositAmount ?? 0) * 10;

    const partnerDecision = await this.partner.submitApplication({
      bookingId: booking.id,
      planId: plan.id,
      totalAmount,
      tenantId,
    });

    const approved = partnerDecision.status === 'APPROVED';
    const appId = `bnpl_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const installmentRows = approved
      ? buildBnplInstallments(totalAmount, plan.installments).map((ins, i) =>
          this.installments.create({
            id: `${appId}_ins_${i + 1}`,
            tenantId,
            applicationId: appId,
            dueDate: ins.dueDate,
            amount: String(ins.amount),
            status: ins.status,
            paidAt: null,
          }),
        )
      : [];

    const saved = await this.applications.save({
      id: appId,
      tenantId,
      bookingId: booking.id,
      planLabel: plan.label,
      totalAmount: String(totalAmount),
      installmentCount: plan.installments,
      status: approved ? 'APPROVED' : 'PENDING',
      externalId: partnerDecision.externalId ?? null,
      partnerReason: partnerDecision.reason ?? null,
    });

    if (installmentRows.length > 0) {
      await this.installments.save(installmentRows);
    }

    const app = mapEntityToDto(saved, installmentRows);

    await this.audit.append({
      tenantId,
      entityType: 'bnpl_application',
      entityId: app.id,
      action: 'APPLY',
      payload: { application: app },
      actorId: actorId ?? null,
    });

    return {
      data: app,
      meta: {
        uc: ['UC-PAY-07'],
        screen: 'SCR-BUYER-001',
        mode: this.partner.isLiveMode() ? 'partner-live' : 'partner-sandbox-pending',
      },
    };
  }

  async handlePartnerWebhook(
    tenantId: string,
    input: { externalId: string; status: 'APPROVED' | 'REJECTED'; reason?: string },
  ) {
    const row = await this.applications.findOne({
      where: { tenantId, externalId: input.externalId },
    });
    if (!row) {
      throw new NotFoundException({ detail: `BNPL application ${input.externalId} not found` });
    }

    const plan = BNPL_PLANS.find((p) => p.label === row.planLabel) ?? BNPL_PLANS[0]!;
    row.status = input.status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    row.partnerReason = input.reason ?? row.partnerReason;

    if (input.status === 'APPROVED') {
      await this.installments.delete({ tenantId, applicationId: row.id });
      const installmentRows = buildBnplInstallments(Number(row.totalAmount), plan.installments).map(
        (ins, i) =>
          this.installments.create({
            id: `${row.id}_ins_${i + 1}`,
            tenantId,
            applicationId: row.id,
            dueDate: ins.dueDate,
            amount: String(ins.amount),
            status: ins.status,
            paidAt: null,
          }),
      );
      await this.installments.save(installmentRows);
    }

    const saved = await this.applications.save(row);
    const ins = await this.installments.find({
      where: { tenantId, applicationId: row.id },
      order: { dueDate: 'ASC' },
    });
    const updated = mapEntityToDto(saved, ins);

    await this.audit.append({
      tenantId,
      entityType: 'bnpl_application',
      entityId: updated.id,
      action: 'PARTNER_WEBHOOK',
      payload: { application: updated },
      actorId: null,
    });

    return {
      data: updated,
      meta: { uc: ['UC-PAY-07'], screen: 'SCR-BUYER-001', mode: 'partner-webhook' },
    };
  }
}
