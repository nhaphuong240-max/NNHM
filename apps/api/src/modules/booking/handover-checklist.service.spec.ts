import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HandoverChecklistEntity } from '../../database/entities/handover-checklists.entity';
import { HandoverChecklistService } from './handover-checklist.service';

function bookings(rows: Array<{ id: string; tenantId: string }>) {
  return {
    findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
      rows.find((row) => row.id === where.id && row.tenantId === where.tenantId) ?? null,
    ),
  };
}

function lists(rows: HandoverChecklistEntity[]) {
  return {
    findOne: jest.fn(async ({ where }: { where: { tenantId: string; bookingId: string } }) =>
      rows.find((row) => row.tenantId === where.tenantId && row.bookingId === where.bookingId) ?? null,
    ),
    create: jest.fn((row: HandoverChecklistEntity) => row),
    save: jest.fn(async (row: HandoverChecklistEntity) => {
      const index = rows.findIndex((item) => item.id === row.id);
      if (index >= 0) rows[index] = row;
      else rows.push(row);
      return row;
    }),
  };
}

describe('handover checklist', () => {
  it('rejects money labels and a booking from another tenant', async () => {
    const service = new HandoverChecklistService(
      bookings([{ id: 'bk_a', tenantId: 'ten_a' }]) as never,
      lists([]) as never,
    );
    await expect(
      service.open({
        tenantId: 'ten_a',
        actorId: 'usr_a',
        actorRole: 'AGENT',
        bookingId: 'bk_a',
        items: ['Chìa khóa'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.open({
        tenantId: 'ten_a',
        actorId: 'usr_a',
        actorRole: 'DEVELOPER_ADMIN',
        bookingId: 'bk_a',
        items: ['price 100'],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(
      service.open({
        tenantId: 'ten_b',
        actorId: 'usr_a',
        actorRole: 'DEVELOPER_ADMIN',
        bookingId: 'bk_a',
        items: ['Chìa khóa'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('opens one checklist and lets a different admin complete it without posting ERP', async () => {
    const store: HandoverChecklistEntity[] = [];
    const service = new HandoverChecklistService(
      bookings([{ id: 'bk_a', tenantId: 'ten_a' }]) as never,
      lists(store) as never,
    );
    const opened = await service.open({
      tenantId: 'ten_a',
      actorId: 'usr_a',
      actorRole: 'DEVELOPER_ADMIN',
      bookingId: 'bk_a',
      items: ['Chìa khóa', 'Đồng hồ điện'],
    });
    expect(opened.status).toBe('OPEN');
    expect(opened.payload).toMatchObject({ erpPosted: false, openedBy: 'usr_a' });
    await expect(
      service.open({
        tenantId: 'ten_a',
        actorId: 'usr_b',
        actorRole: 'DEVELOPER_ADMIN',
        bookingId: 'bk_a',
        items: ['Sổ'],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.complete({ tenantId: 'ten_a', actorId: 'usr_a', actorRole: 'DEVELOPER_ADMIN', bookingId: 'bk_a' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const done = await service.complete({
      tenantId: 'ten_a',
      actorId: 'usr_b',
      actorRole: 'DEVELOPER_ADMIN',
      bookingId: 'bk_a',
    });
    expect(done.status).toBe('COMPLETE');
    expect(done.payload).toMatchObject({ erpPosted: false, completedBy: 'usr_b' });
  });
});
