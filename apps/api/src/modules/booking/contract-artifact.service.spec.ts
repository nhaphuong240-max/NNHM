import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BookingEntity } from '../../database/entities/booking.entity';
import { ContractArtifactEntity } from '../../database/entities/contract-artifacts.entity';
import { ContractArtifactService } from './contract-artifact.service';

function bookings(rows: Array<Pick<BookingEntity, 'id' | 'tenantId'>>) {
  return {
    findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
      rows.find((row) => row.id === where.id && row.tenantId === where.tenantId) ?? null,
    ),
  };
}

function artifacts(rows: ContractArtifactEntity[]) {
  return {
    findOne: jest.fn(
      async ({
        where,
      }: {
        where: { tenantId: string; bookingId: string; templateVersion: string };
      }) =>
        rows.find(
          (row) =>
            row.tenantId === where.tenantId &&
            row.bookingId === where.bookingId &&
            row.templateVersion === where.templateVersion,
        ) ?? null,
    ),
    create: jest.fn((row: ContractArtifactEntity) => row),
    save: jest.fn(async (row: ContractArtifactEntity) => {
      rows.push(row);
      return row;
    }),
  };
}

describe('contract artifact review', () => {
  it('stores pending review for the booking tenant and refuses an executed status', async () => {
    const store: ContractArtifactEntity[] = [];
    const service = new ContractArtifactService(
      bookings([{ id: 'bk_a', tenantId: 'ten_a' }]) as never,
      artifacts(store) as never,
    );
    await expect(
      service.register({
        tenantId: 'ten_a',
        actorRole: 'AGENT',
        bookingId: 'bk_a',
        templateVersion: 'v1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.register({
        tenantId: 'ten_b',
        actorRole: 'DEVELOPER_ADMIN',
        bookingId: 'bk_a',
        templateVersion: 'v1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    const saved = await service.register({
      tenantId: 'ten_a',
      actorRole: 'DEVELOPER_ADMIN',
      bookingId: 'bk_a',
      templateVersion: 'v1',
    });
    expect(saved.status).toBe('PENDING_REVIEW');
    expect(saved.payload).toEqual({ executed: false });
    expect(saved.tenantId).toBe('ten_a');
    await expect(
      service.register({
        tenantId: 'ten_a',
        actorRole: 'DEVELOPER_ADMIN',
        bookingId: 'bk_a',
        templateVersion: 'v1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(() => service.refuseExecuted()).toThrow(UnprocessableEntityException);
    expect(store.every((row) => row.status !== 'EXECUTED')).toBe(true);
  });
});
