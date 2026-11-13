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
import { ContractArtifactEntity } from '../../database/entities/contract-artifacts.entity';

const ARTIFACT_WRITER_ROLE = 'DEVELOPER_ADMIN';

@Injectable()
export class ContractArtifactService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(ContractArtifactEntity)
    private readonly artifacts: Repository<ContractArtifactEntity>,
  ) {}

  async register(input: {
    tenantId: string;
    actorRole: string | undefined;
    bookingId: string;
    templateVersion: string;
  }): Promise<ContractArtifactEntity> {
    if (input.actorRole !== ARTIFACT_WRITER_ROLE) {
      throw new ForbiddenException({ detail: 'contract artifacts require a developer admin' });
    }
    const templateVersion = input.templateVersion.trim();
    if (!templateVersion || templateVersion.length > 64) {
      throw new UnprocessableEntityException({ detail: 'template version is required' });
    }
    const booking = await this.bookings.findOne({
      where: { id: input.bookingId, tenantId: input.tenantId },
    });
    if (!booking) throw new NotFoundException({ detail: 'booking not found' });
    const existing = await this.artifacts.findOne({
      where: { tenantId: input.tenantId, bookingId: booking.id, templateVersion },
    });
    if (existing) throw new ConflictException({ detail: 'contract artifact already exists' });
    return this.artifacts.save(
      this.artifacts.create({
        id: `car_${randomBytes(12).toString('hex')}`,
        tenantId: input.tenantId,
        bookingId: booking.id,
        templateVersion,
        status: 'PENDING_REVIEW',
        payload: { executed: false },
      }),
    );
  }

  refuseExecuted(): never {
    throw new UnprocessableEntityException({
      detail: 'contract artifact cannot be marked executed without a provider artifact',
    });
  }
}
