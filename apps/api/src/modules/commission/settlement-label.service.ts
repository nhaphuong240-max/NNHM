import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionSettlementRunEntity } from '../../database/entities/commission-settlement-run.entity';
import { settlementLabel } from '../spec-target/spec-target.rules';

const LABEL_ROLES = ['FINANCE_ADMIN', 'OPS_ADMIN'] as const;

@Injectable()
export class SettlementLabelService {
  constructor(
    @InjectRepository(CommissionSettlementRunEntity)
    private readonly runs: Repository<CommissionSettlementRunEntity>,
  ) {}

  async read(input: {
    tenantId: string;
    actorRole: string | undefined;
    runId: string;
  }): Promise<{ runId: string; label: string; paid: false }> {
    if (!input.actorRole || !LABEL_ROLES.includes(input.actorRole as (typeof LABEL_ROLES)[number])) {
      throw new ForbiddenException({ detail: 'settlement labels require a finance operator' });
    }
    const run = await this.runs.findOne({ where: { id: input.runId, tenantId: input.tenantId } });
    if (!run) throw new NotFoundException({ detail: 'settlement run not found' });
    const kind = run.status === 'COMPLETED' ? 'PAID' : run.status;
    return {
      runId: run.id,
      label: settlementLabel(kind, null),
      paid: false,
    };
  }
}
