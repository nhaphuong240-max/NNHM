import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { RefundEntity } from '../../database/entities/refund.entity';
import { RefundCheckService } from './refund-check.service';

function intents(rows: Array<Pick<PaymentIntentEntity, 'id' | 'tenantId' | 'amount' | 'currency'>>) {
  return {
    findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
      rows.find((row) => row.id === where.id && row.tenantId === where.tenantId) ?? null,
    ),
  };
}

function refunds(rows: Array<Pick<RefundEntity, 'tenantId' | 'paymentIntentId' | 'status' | 'amount'>>) {
  return {
    find: jest.fn(
      async ({ where }: { where: { tenantId: string; paymentIntentId: string; status: string } }) =>
        rows.filter(
          (row) =>
            row.tenantId === where.tenantId &&
            row.paymentIntentId === where.paymentIntentId &&
            row.status === where.status,
        ),
    ),
  };
}

function events(rows: AuditEventEntity[]) {
  return {
    findOne: jest.fn(
      async ({ where }: { where: { tenantId: string; entityId: string; action: string } }) =>
        rows.find(
          (row) =>
            row.tenantId === where.tenantId &&
            row.entityId === where.entityId &&
            row.action === where.action,
        ) ?? null,
    ),
  };
}

describe('refund maker checker', () => {
  it('rejects a sales user, another tenant, a mismatched currency, and an amount over the net', async () => {
    const audit = { append: jest.fn() };
    const service = new RefundCheckService(
      intents([{ id: 'pi_a', tenantId: 'ten_a', amount: '100', currency: 'VND' }]) as never,
      refunds([{ tenantId: 'ten_a', paymentIntentId: 'pi_a', status: 'SUCCEEDED', amount: '40' }]) as never,
      events([]) as never,
      audit as never,
    );
    await expect(
      service.propose({
        tenantId: 'ten_a',
        actorId: 'usr_maker',
        actorRole: 'AGENT',
        paymentIntentId: 'pi_a',
        amount: 10,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.propose({
        tenantId: 'ten_b',
        actorId: 'usr_maker',
        actorRole: 'FINANCE_ADMIN',
        paymentIntentId: 'pi_a',
        amount: 10,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.propose({
        tenantId: 'ten_a',
        actorId: 'usr_maker',
        actorRole: 'FINANCE_ADMIN',
        paymentIntentId: 'pi_a',
        amount: 10,
        currency: 'USD',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(
      service.propose({
        tenantId: 'ten_a',
        actorId: 'usr_maker',
        actorRole: 'FINANCE_ADMIN',
        paymentIntentId: 'pi_a',
        amount: 61,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(audit.append).not.toHaveBeenCalled();
  });

  it('lets a different operator check the proposal and does not mark it paid', async () => {
    const stored: AuditEventEntity[] = [];
    const audit = {
      append: jest.fn(async (input: Omit<AuditEventEntity, 'id' | 'createdAt'>) => {
        const row = { ...input, id: String(stored.length + 1), createdAt: new Date() } as AuditEventEntity;
        stored.push(row);
        return row;
      }),
    };
    const service = new RefundCheckService(
      intents([{ id: 'pi_a', tenantId: 'ten_a', amount: '100', currency: 'VND' }]) as never,
      refunds([{ tenantId: 'ten_a', paymentIntentId: 'pi_a', status: 'SUCCEEDED', amount: '40' }]) as never,
      events(stored) as never,
      audit as never,
    );
    const proposed = await service.propose({
      tenantId: 'ten_a',
      actorId: 'usr_maker',
      actorRole: 'FINANCE_ADMIN',
      paymentIntentId: 'pi_a',
      amount: 60,
    });
    expect(proposed).toEqual({ status: 'PROPOSED', amount: 60, currency: 'VND', paid: false });
    await expect(
      service.approve({
        tenantId: 'ten_a',
        actorId: 'usr_maker',
        actorRole: 'OPS_ADMIN',
        paymentIntentId: 'pi_a',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const checked = await service.approve({
      tenantId: 'ten_a',
      actorId: 'usr_checker',
      actorRole: 'OPS_ADMIN',
      paymentIntentId: 'pi_a',
    });
    expect(checked).toEqual({ status: 'CHECKED', amount: 60, currency: 'VND', paid: false });
    expect(stored.map((row) => row.action)).toEqual(['REFUND_PROPOSED', 'REFUND_CHECKED']);
    await expect(
      service.approve({
        tenantId: 'ten_a',
        actorId: 'usr_checker',
        actorRole: 'OPS_ADMIN',
        paymentIntentId: 'pi_a',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
