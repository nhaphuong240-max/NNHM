import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { ExceptionItemEntity } from '../../database/entities/exception-items.entity';

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const REVIEWER_ROLES = ['OPS_ADMIN', 'DEVELOPER_ADMIN'] as const;

@Injectable()
export class ExceptionItemService {
  constructor(
    @InjectRepository(ExceptionItemEntity)
    private readonly items: Repository<ExceptionItemEntity>,
  ) {}

  async listMine(input: {
    tenantId: string;
    actorId: string;
    actorRole: string | undefined;
  }): Promise<Array<Pick<ExceptionItemEntity, 'id' | 'severity' | 'status' | 'dueAt'>>> {
    if (!input.actorRole || !REVIEWER_ROLES.includes(input.actorRole as (typeof REVIEWER_ROLES)[number])) {
      throw new ForbiddenException({ detail: 'exception items require an operator' });
    }
    const rows = await this.items.find({
      where: { tenantId: input.tenantId, ownerId: input.actorId },
      order: { dueAt: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      severity: row.severity,
      status: row.status,
      dueAt: row.dueAt,
    }));
  }

  async open(input: {
    tenantId: string;
    actorId: string;
    actorRole: string | undefined;
    severity: string;
    dueAt: Date;
  }): Promise<ExceptionItemEntity> {
    if (!input.actorRole || !REVIEWER_ROLES.includes(input.actorRole as (typeof REVIEWER_ROLES)[number])) {
      throw new ForbiddenException({ detail: 'exception items require an operator' });
    }
    if (!SEVERITIES.includes(input.severity as (typeof SEVERITIES)[number])) {
      throw new UnprocessableEntityException({ detail: 'severity is invalid' });
    }
    if (Number.isNaN(input.dueAt.getTime()) || input.dueAt.getTime() <= Date.now()) {
      throw new UnprocessableEntityException({ detail: 'due time must be in the future' });
    }
    return this.items.save(
      this.items.create({
        id: `exi_${randomBytes(12).toString('hex')}`,
        tenantId: input.tenantId,
        ownerId: input.actorId,
        severity: input.severity,
        dueAt: input.dueAt,
        status: 'OPEN',
        payload: { kind: 'DISPUTE', openedBy: input.actorId },
      }),
    );
  }

  async resolve(input: {
    tenantId: string;
    itemId: string;
    actorId: string;
    actorRole: string | undefined;
  }): Promise<ExceptionItemEntity> {
    if (!input.actorRole || !REVIEWER_ROLES.includes(input.actorRole as (typeof REVIEWER_ROLES)[number])) {
      throw new ForbiddenException({ detail: 'exception items require an operator' });
    }
    const item = await this.items.findOne({ where: { id: input.itemId, tenantId: input.tenantId } });
    if (!item) throw new NotFoundException({ detail: 'exception item not found' });
    if (item.status !== 'OPEN') {
      throw new ConflictException({ detail: 'exception item is not open' });
    }
    const openedBy = typeof item.payload.openedBy === 'string' ? item.payload.openedBy : item.ownerId;
    if (openedBy === input.actorId) {
      throw new ForbiddenException({ detail: 'the opener cannot resolve the exception' });
    }
    item.status = 'RESOLVED';
    item.payload = { ...item.payload, resolvedBy: input.actorId };
    return this.items.save(item);
  }
}
