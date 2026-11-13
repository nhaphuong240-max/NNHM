import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { ExportJobEntity } from '../../database/entities/export-jobs.entity';
import { exportJobAllowed } from '../spec-target/spec-target.rules';

type ExportPayload = {
  requesterId: string;
  rowCount: number;
  rowLimit: number;
};

function readPayload(payload: Record<string, unknown>): ExportPayload | null {
  const requesterId = typeof payload.requesterId === 'string' ? payload.requesterId : '';
  const rowCount = payload.rowCount;
  const rowLimit = payload.rowLimit;
  if (!requesterId || typeof rowCount !== 'number' || typeof rowLimit !== 'number') return null;
  return { requesterId, rowCount, rowLimit };
}

@Injectable()
export class ExportJobService {
  constructor(
    @InjectRepository(ExportJobEntity)
    private readonly jobs: Repository<ExportJobEntity>,
  ) {}

  async request(input: {
    tenantId: string;
    requesterId: string;
    purpose: string;
    expiresAt: Date;
    rowCount: number;
    rowLimit: number;
  }): Promise<ExportJobEntity> {
    const purpose = input.purpose.trim();
    if (!purpose || purpose.length > 64) {
      throw new UnprocessableEntityException({ detail: 'purpose is required' });
    }
    if (Number.isNaN(input.expiresAt.getTime()) || input.expiresAt.getTime() <= Date.now()) {
      throw new UnprocessableEntityException({ detail: 'export expiry must be in the future' });
    }
    if (!Number.isInteger(input.rowCount) || input.rowCount < 0) {
      throw new UnprocessableEntityException({ detail: 'row count is invalid' });
    }
    if (!Number.isInteger(input.rowLimit) || input.rowLimit < input.rowCount) {
      throw new UnprocessableEntityException({ detail: 'row limit is invalid' });
    }
    return this.jobs.save(
      this.jobs.create({
        id: `exp_${randomBytes(12).toString('hex')}`,
        tenantId: input.tenantId,
        purpose,
        approvedBy: null,
        expiresAt: input.expiresAt,
        status: 'REQUESTED',
        payload: {
          requesterId: input.requesterId,
          rowCount: input.rowCount,
          rowLimit: input.rowLimit,
        },
      }),
    );
  }

  async approve(input: {
    tenantId: string;
    jobId: string;
    approverId: string;
    now: Date;
  }): Promise<ExportJobEntity> {
    const job = await this.jobs.findOne({ where: { id: input.jobId, tenantId: input.tenantId } });
    if (!job) throw new NotFoundException({ detail: 'export job not found' });
    if (job.status !== 'REQUESTED') {
      throw new UnprocessableEntityException({ detail: 'export job is not awaiting approval' });
    }
    const payload = readPayload(job.payload);
    if (!payload) {
      throw new UnprocessableEntityException({ detail: 'export job payload is incomplete' });
    }
    const decision = exportJobAllowed({
      purpose: job.purpose,
      approvedBy: input.approverId,
      requesterId: payload.requesterId,
      rowCount: payload.rowCount,
      rowLimit: payload.rowLimit,
      expiresAt: job.expiresAt,
      now: input.now,
    });
    if (!decision.ok) {
      throw new UnprocessableEntityException({ detail: decision.reason });
    }
    job.approvedBy = input.approverId;
    job.status = 'APPROVED';
    const saved = await this.jobs.save(job);
    return saved;
  }
}
