import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BusinessErrorCode, throwBusinessError } from '../../common/business-error';
import { LeadRegistrationEntity } from '../../database/entities/lead-registration.entity';
import { OpenDayEventEntity } from '../../database/entities/open-day-event.entity';
import { OpenDayRsvpEntity } from '../../database/entities/open-day-rsvp.entity';
import { DemandPolicyService } from '../crm/demand-policy.service';

/** P1 FR-VIEW-002 — open day RSVP + QR check-in extends protection. */
@Injectable()
export class OpenDayService {
  constructor(
    @InjectRepository(OpenDayEventEntity)
    private readonly events: Repository<OpenDayEventEntity>,
    @InjectRepository(OpenDayRsvpEntity)
    private readonly rsvps: Repository<OpenDayRsvpEntity>,
    @InjectRepository(LeadRegistrationEntity)
    private readonly registrations: Repository<LeadRegistrationEntity>,
    private readonly policy: DemandPolicyService,
  ) {}

  async listEvents(tenantId: string, projectId?: string) {
    const where = projectId ? { tenantId, projectId, status: 'OPEN' as const } : { tenantId, status: 'OPEN' as const };
    const rows = await this.events.find({ where, order: { startsAt: 'ASC' }, take: 20 });
    const counts = await Promise.all(
      rows.map(async (e) => this.rsvps.count({ where: { tenantId, eventId: e.id } })),
    );
    return {
      data: rows.map((e, i) => ({
        id: e.id,
        projectId: e.projectId,
        title: e.title,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt.toISOString(),
        capacity: e.capacity,
        rsvpCount: counts[i],
        spotsLeft: Math.max(0, e.capacity - counts[i]),
      })),
    };
  }

  async rsvp(
    tenantId: string,
    eventId: string,
    input: { fullName: string; phone: string; leadId?: string },
  ) {
    const event = await this.events.findOne({ where: { id: eventId, tenantId, status: 'OPEN' } });
    if (!event) throwBusinessError(BusinessErrorCode.NOT_FOUND, 'Open day not found');
    const count = await this.rsvps.count({ where: { tenantId, eventId } });
    if (count >= event.capacity) {
      throwBusinessError(BusinessErrorCode.VALIDATION_FAILED, 'Open day is full');
    }
    const qrToken = createHmac('sha256', event.qrSecret)
      .update(`${input.phone}:${eventId}`)
      .digest('hex')
      .slice(0, 24);
    const row = await this.rsvps.save({
      id: `rsvp_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      eventId,
      leadId: input.leadId ?? null,
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      qrToken,
      checkedInAt: null,
    });
    return {
      data: {
        id: row.id,
        qrToken: row.qrToken,
        eventTitle: event.title,
        startsAt: event.startsAt.toISOString(),
      },
    };
  }

  async checkIn(tenantId: string, qrToken: string, actorId: string) {
    const rsvp = await this.rsvps.findOne({ where: { tenantId, qrToken } });
    if (!rsvp) throwBusinessError(BusinessErrorCode.NOT_FOUND, 'Invalid QR ticket');
    if (rsvp.checkedInAt) {
      return { data: { alreadyCheckedIn: true, checkedInAt: rsvp.checkedInAt.toISOString() } };
    }
    rsvp.checkedInAt = new Date();
    await this.rsvps.save(rsvp);

    const event = await this.events.findOne({ where: { id: rsvp.eventId, tenantId } });
    if (event && rsvp.leadId) {
      const payload = await this.policy.resolvePayload(tenantId);
      const reg = await this.registrations.findOne({
        where: { tenantId, leadId: rsvp.leadId, projectId: event.projectId, status: 'ACCEPTED' },
      });
      if (reg && payload.dealProtection.viewingConfirmedExtendsProtection) {
        reg.protectedUntil = new Date(
          Date.now() + payload.dealProtection.protectionDays * 24 * 60 * 60 * 1000,
        );
        await this.registrations.save(reg);
      }
    }

    return {
      data: {
        rsvpId: rsvp.id,
        checkedInAt: rsvp.checkedInAt.toISOString(),
        checkedInBy: actorId,
        protectionExtended: Boolean(event && rsvp.leadId),
      },
    };
  }
}
