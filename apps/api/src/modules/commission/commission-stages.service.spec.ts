import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommissionEntryEntity } from '../../database/entities/commission-entry.entity';
import { CommissionStagesService, stageCommissionAmount } from './commission-stages.service';

describe('commission stages', () => {
  it('keeps earned, payable, and paid apart and never marks paid', () => {
    expect(stageCommissionAmount('PENDING', '1000')).toEqual({ earned: '1000', payable: '0', paid: '0' });
    expect(stageCommissionAmount('APPROVED', '1000')).toEqual({ earned: '1000', payable: '1000', paid: '0' });
    expect(stageCommissionAmount('PAID', '1000')).toEqual({ earned: '1000', payable: '1000', paid: '0' });
    expect(stageCommissionAmount('SIMULATED', '1000')).toEqual({ earned: '0', payable: '0', paid: '0' });
    expect(stageCommissionAmount('SKIPPED', '1000').paid).toBe('0');
  });

  it('hides another tenant entry and refuses a sales user', async () => {
    const entries = {
      findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) => {
        const row = {
          id: 'ce_a',
          tenantId: 'ten_a',
          amount: '2500',
          payoutStatus: 'APPROVED',
        } as CommissionEntryEntity;
        return row.id === where.id && row.tenantId === where.tenantId ? row : null;
      }),
      save: jest.fn(),
    };
    const service = new CommissionStagesService(entries as never);
    await expect(
      service.read({ tenantId: 'ten_a', actorRole: 'AGENT', entryId: 'ce_a' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.read({ tenantId: 'ten_b', actorRole: 'FINANCE_ADMIN', entryId: 'ce_a' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.read({ tenantId: 'ten_a', actorRole: 'FINANCE_ADMIN', entryId: 'ce_a' }),
    ).resolves.toEqual({
      entryId: 'ce_a',
      currency: 'UNCHANGED',
      earned: '2500',
      payable: '2500',
      paid: '0',
    });
    expect(entries.save).not.toHaveBeenCalled();
  });
});
