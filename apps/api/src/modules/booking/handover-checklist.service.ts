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
import { BookingEntity } from '../../database/entities/booking.entity';
import { HandoverChecklistEntity } from '../../database/entities/handover-checklists.entity';

const HANDOVER_ROLE = 'DEVELOPER_ADMIN';
const BLOCKED_KEYS = ['price', 'amount', 'bnpl', 'receivable', 'commission'];

@Injectable()
export class HandoverChecklistService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(HandoverChecklistEntity)
    private readonly lists: Repository<HandoverChecklistEntity>,
  ) {}

  async open(input: {
    tenantId: string;
    actorId: string;
    actorRole: string | undefined;
    bookingId: string;
    items: string[];
  }): Promise<HandoverChecklistEntity> {
    if (input.actorRole !== HANDOVER_ROLE) {
      throw new ForbiddenException({ detail: 'handover checklists require a developer admin' });
    }
    const items = input.items.map((item) => item.trim()).filter(Boolean);
    if (!items.length || items.some((item) => BLOCKED_KEYS.some((key) => item.toLowerCase().includes(key)))) {
      throw new UnprocessableEntityException({ detail: 'handover items must be labels without money fields' });
    }
    const booking = await this.bookings.findOne({ where: { id: input.bookingId, tenantId: input.tenantId } });
    if (!booking) throw new NotFoundException({ detail: 'booking not found' });
    const existing = await this.lists.findOne({ where: { tenantId: input.tenantId, bookingId: booking.id } });
    if (existing) throw new ConflictException({ detail: 'handover checklist already exists' });
    return this.lists.save(
      this.lists.create({
        id: `hov_${randomBytes(12).toString('hex')}`,
        tenantId: input.tenantId,
        bookingId: booking.id,
        status: 'OPEN',
        payload: { openedBy: input.actorId, items, erpPosted: false },
      }),
    );
  }

  async complete(input: {
    tenantId: string;
    actorId: string;
    actorRole: string | undefined;
    bookingId: string;
  }): Promise<HandoverChecklistEntity> {
    if (input.actorRole !== HANDOVER_ROLE) {
      throw new ForbiddenException({ detail: 'handover checklists require a developer admin' });
    }
    const row = await this.lists.findOne({ where: { tenantId: input.tenantId, bookingId: input.bookingId } });
    if (!row) throw new NotFoundException({ detail: 'handover checklist not found' });
    if (row.status === 'COMPLETE') {
      throw new ConflictException({ detail: 'handover checklist is already complete' });
    }
    if (row.status !== 'OPEN') {
      throw new UnprocessableEntityException({ detail: 'handover checklist cannot be completed from this status' });
    }
    const openedBy = typeof row.payload.openedBy === 'string' ? row.payload.openedBy : '';
    if (!openedBy || openedBy === input.actorId) {
      throw new ForbiddenException({ detail: 'the opener cannot complete the handover' });
    }
    row.status = 'COMPLETE';
    row.payload = { ...row.payload, completedBy: input.actorId, erpPosted: false };
    return this.lists.save(row);
  }
}
