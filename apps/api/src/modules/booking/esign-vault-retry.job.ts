import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SignatureEventEntity } from '../../database/entities/signature-event.entity';
import { ScheduleLeaderService } from '../../infrastructure/redis/schedule-leader.service';
import { BookingContractService } from './booking-contract.service';
import {
  PENDING_SIGNED_WITHOUT_VAULT_SQL,
  readVaultRetryLimits,
  retryMissingVaultUploads,
  type PendingVaultRow,
} from './esign-vault-retry';

@Injectable()
export class EsignVaultRetryJob {
  private readonly logger = new Logger(EsignVaultRetryJob.name);

  constructor(
    private readonly config: ConfigService,
    private readonly contracts: BookingContractService,
    @InjectRepository(SignatureEventEntity)
    private readonly events: Repository<SignatureEventEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly scheduleLeader: ScheduleLeaderService,
  ) {}

  /** Uploads a signed copy that never reached the vault. Limits come from env; empty env does not run. */
  @Cron(CronExpression.EVERY_MINUTE)
  async retryMissingUploads(): Promise<{ ran: boolean; attempted: number; stored: number }> {
    if (!(await this.scheduleLeader.isLeader('esign-vault-retry', 50))) {
      return { ran: false, attempted: 0, stored: 0 };
    }
    return this.run();
  }

  async run(): Promise<{ ran: boolean; attempted: number; stored: number }> {
    const limits = readVaultRetryLimits((key) => this.config.get<string>(key));
    if (!limits) {
      this.logger.warn('esign vault retry is not configured');
      return { ran: false, attempted: 0, stored: 0 };
    }
    const pending = (await this.dataSource.query(PENDING_SIGNED_WITHOUT_VAULT_SQL)) as PendingVaultRow[];
    const result = await retryMissingVaultUploads({
      limits,
      pending,
      events: this.events,
      contracts: this.contracts,
    });
    return { ran: true, ...result };
  }
}
