import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommissionSettlementRunEntity } from '../../database/entities/commission-settlement-run.entity';
import { SettlementLabelService } from './settlement-label.service';

describe('settlement label', () => {
  const runs = {
    findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) => {
      const row = {
        id: 'sr_a',
        tenantId: 'ten_a',
        status: 'COMPLETED',
      } as CommissionSettlementRunEntity;
      return row.id === where.id && row.tenantId === where.tenantId ? row : null;
    }),
    save: jest.fn(),
  };

  it('does not call a completed run paid when there is no bank evidence', async () => {
    const service = new SettlementLabelService(runs as never);
    await expect(
      service.read({ tenantId: 'ten_a', actorRole: 'AGENT', runId: 'sr_a' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.read({ tenantId: 'ten_b', actorRole: 'FINANCE_ADMIN', runId: 'sr_a' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.read({ tenantId: 'ten_a', actorRole: 'FINANCE_ADMIN', runId: 'sr_a' }),
    ).resolves.toEqual({ runId: 'sr_a', label: 'NOT_PAID', paid: false });
    expect(runs.save).not.toHaveBeenCalled();
  });
});
