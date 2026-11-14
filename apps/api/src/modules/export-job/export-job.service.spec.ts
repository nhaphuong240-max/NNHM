import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ExportJobEntity } from '../../database/entities/export-jobs.entity';
import { ExportJobService } from './export-job.service';

function memory(rows: ExportJobEntity[]) {
  return {
    findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
      rows.find((row) => row.id === where.id && row.tenantId === where.tenantId) ?? null,
    ),
    create: jest.fn((row: ExportJobEntity) => row),
    save: jest.fn(async (row: ExportJobEntity) => row),
  };
}

describe('export job approval', () => {
  const later = new Date(Date.now() + 60 * 60 * 1000);

  it('stores a requested job for the caller tenant and rejects a blank purpose', async () => {
    const jobs = memory([]);
    const service = new ExportJobService(jobs as never);
    await expect(
      service.request({
        tenantId: 'ten_a',
        requesterId: 'usr_maker',
        purpose: '   ',
        expiresAt: later,
        rowCount: 0,
        rowLimit: 10,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    const saved = await service.request({
      tenantId: 'ten_a',
      requesterId: 'usr_maker',
      purpose: 'support-review',
      expiresAt: later,
      rowCount: 0,
      rowLimit: 10,
    });
    expect(saved.tenantId).toBe('ten_a');
    expect(saved.status).toBe('REQUESTED');
    expect(saved.approvedBy).toBeNull();
    expect(saved.payload).toMatchObject({ requesterId: 'usr_maker', rowCount: 0, rowLimit: 10 });
  });

  it('refuses the requester as approver and hides another tenant job', async () => {
    const job: ExportJobEntity = {
      id: 'exp_a',
      tenantId: 'ten_a',
      purpose: 'support-review',
      approvedBy: null,
      expiresAt: later,
      status: 'REQUESTED',
      payload: { requesterId: 'usr_maker', rowCount: 1, rowLimit: 10 },
      createdAt: new Date(),
    };
    const jobs = memory([job]);
    const service = new ExportJobService(jobs as never);
    await expect(
      service.approve({
        tenantId: 'ten_a',
        jobId: 'exp_a',
        approverId: 'usr_maker',
        actorRole: 'FINANCE_ADMIN',
        now: new Date(),
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(
      service.approve({
        tenantId: 'ten_b',
        jobId: 'exp_a',
        approverId: 'usr_checker',
        actorRole: 'FINANCE_ADMIN',
        now: new Date(),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.approve({
        tenantId: 'ten_a',
        jobId: 'exp_a',
        approverId: 'usr_checker',
        actorRole: 'AGENT',
        now: new Date(),
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const approved = await service.approve({
      tenantId: 'ten_a',
      jobId: 'exp_a',
      approverId: 'usr_checker',
      actorRole: 'FINANCE_ADMIN',
      now: new Date(),
    });
    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedBy).toBe('usr_checker');
    expect(approved.payload).not.toHaveProperty('rows');
    await expect(
      service.approve({
        tenantId: 'ten_a',
        jobId: 'exp_a',
        approverId: 'usr_checker',
        actorRole: 'FINANCE_ADMIN',
        now: new Date(),
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
