import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import {
  DEFAULT_BOOKING_WORKFLOW,
  validateWorkflow,
  type BookingWorkflowDefinition,
} from './booking-workflow.util';

@Injectable()
export class BookingWorkflowService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    private readonly audit: AuditService,
  ) {}

  /** UC-BK-08 · SCR-ADMIN-023 */
  async getWorkflow(tenantId: string) {
    const def = await this.loadWorkflow(tenantId);
    return {
      data: def,
      meta: { uc: ['UC-BK-08'], screen: 'SCR-ADMIN-023', tenantId },
    };
  }

  async saveDraft(
    tenantId: string,
    input: { name?: string; states?: BookingWorkflowDefinition['states']; transitions?: BookingWorkflowDefinition['transitions'] },
    actorId?: string,
  ) {
    const current = await this.loadWorkflow(tenantId);
    const next: BookingWorkflowDefinition = {
      ...current,
      name: input.name?.trim() || current.name,
      states: input.states?.length ? input.states : current.states,
      transitions: input.transitions?.length ? input.transitions : current.transitions,
      status: 'DRAFT',
      version: current.version + 1,
    };
    const errors = validateWorkflow(next);
    if (errors.length) {
      throw new UnprocessableEntityException({ detail: errors.join(', ') });
    }

    await this.audit.append({
      tenantId,
      entityType: 'booking_workflow',
      entityId: next.id,
      action: 'UPDATE',
      payload: { workflow: next },
      actorId: actorId ?? null,
    });

    return this.getWorkflow(tenantId);
  }

  async publish(tenantId: string, actorId?: string) {
    const current = await this.loadWorkflow(tenantId);
    const published: BookingWorkflowDefinition = {
      ...current,
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
    };

    await this.audit.append({
      tenantId,
      entityType: 'booking_workflow',
      entityId: published.id,
      action: 'PUBLISH',
      payload: { workflow: published },
      actorId: actorId ?? null,
    });

    return { data: published, meta: { uc: ['UC-BK-08'], screen: 'SCR-ADMIN-023' } };
  }

  private async loadWorkflow(tenantId: string): Promise<BookingWorkflowDefinition> {
    const row = await this.auditEvents.findOne({
      where: { tenantId, entityType: 'booking_workflow' },
      order: { createdAt: 'DESC' },
    });
    const payload = (row?.payload ?? {}) as { workflow?: BookingWorkflowDefinition };
    if (payload.workflow) return payload.workflow;

    return {
      id: `bwf_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      ...DEFAULT_BOOKING_WORKFLOW,
    };
  }
}
