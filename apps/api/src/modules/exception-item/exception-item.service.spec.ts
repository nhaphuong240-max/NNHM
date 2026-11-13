import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExceptionItemEntity } from '../../database/entities/exception-items.entity';
import { ExceptionItemService } from './exception-item.service';

function memory(rows: ExceptionItemEntity[]) {
  return {
    findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
      rows.find((row) => row.id === where.id && row.tenantId === where.tenantId) ?? null,
    ),
    create: jest.fn((row: ExceptionItemEntity) => row),
    save: jest.fn(async (row: ExceptionItemEntity) => {
      const index = rows.findIndex((item) => item.id === row.id);
      if (index >= 0) rows[index] = row;
      else rows.push(row);
      return row;
    }),
  };
}

describe('exception item review', () => {
  const later = new Date(Date.now() + 60 * 60 * 1000);

  it('rejects a sales user and an unknown severity', async () => {
    const service = new ExceptionItemService(memory([]) as never);
    await expect(
      service.open({
        tenantId: 'ten_a',
        actorId: 'usr_op',
        actorRole: 'AGENT',
        severity: 'HIGH',
        dueAt: later,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.open({
        tenantId: 'ten_a',
        actorId: 'usr_op',
        actorRole: 'OPS_ADMIN',
        severity: 'URGENT',
        dueAt: later,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('opens a dispute for the caller tenant and blocks the opener from resolving it', async () => {
    const rows: ExceptionItemEntity[] = [];
    const service = new ExceptionItemService(memory(rows) as never);
    const opened = await service.open({
      tenantId: 'ten_a',
      actorId: 'usr_op',
      actorRole: 'OPS_ADMIN',
      severity: 'HIGH',
      dueAt: later,
    });
    expect(opened.tenantId).toBe('ten_a');
    expect(opened.status).toBe('OPEN');
    expect(opened.payload).toMatchObject({ kind: 'DISPUTE', openedBy: 'usr_op' });
    await expect(
      service.resolve({
        tenantId: 'ten_a',
        itemId: opened.id,
        actorId: 'usr_op',
        actorRole: 'DEVELOPER_ADMIN',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.resolve({
        tenantId: 'ten_b',
        itemId: opened.id,
        actorId: 'usr_other',
        actorRole: 'OPS_ADMIN',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    const resolved = await service.resolve({
      tenantId: 'ten_a',
      itemId: opened.id,
      actorId: 'usr_other',
      actorRole: 'OPS_ADMIN',
    });
    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.payload).toMatchObject({ resolvedBy: 'usr_other' });
    await expect(
      service.resolve({
        tenantId: 'ten_a',
        itemId: opened.id,
        actorId: 'usr_third',
        actorRole: 'OPS_ADMIN',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
