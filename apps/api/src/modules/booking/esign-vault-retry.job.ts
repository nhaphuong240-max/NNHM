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
  lockVaultRetryRequest,
  readVaultRetryLimits,
  retryMissingVaultUploads,
  vaultRetryLeaderTtlSec,
  type PendingVaultRow,
} from './esign-vault-retry';

const LEADER_KEY = 'esign-vault-retry';

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
    const limits = readVaultRetryLimits((key) => this.config.get<string>(key));
    if (!limits) {
      this.logger.warn('esign vault retry is not configured');
      return { ran: false, attempted: 0, stored: 0 };
    }
    const ttlSec = vaultRetryLeaderTtlSec(limits.intervalSeconds);
    if (!(await this.scheduleLeader.isLeader(LEADER_KEY, ttlSec))) {
      return { ran: false, attempted: 0, stored: 0 };
    }
    return this.run(limits, ttlSec);
  }

  async run(
    limits = readVaultRetryLimits((key) => this.config.get<string>(key)),
    ttlSec = limits ? vaultRetryLeaderTtlSec(limits.intervalSeconds) : 120,
  ): Promise<{ ran: boolean; attempted: number; stored: number }> {
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
      onRow: () => this.scheduleLeader.renewLeader(LEADER_KEY, ttlSec),
      lockRequest: async (row, work) => {
        const runner = this.dataSource.createQueryRunner();
        await runner.connect();
        await runner.startTransaction();
        try {
          if (!(await lockVaultRetryRequest(runner, row))) {
            await runner.rollbackTransaction();
            return 'busy';
          }
          await work(runner);
          await runner.commitTransaction();
          return 'ok';
        } catch (error) {
          await runner.rollbackTransaction();
          throw error;
        } finally {
          await runner.release();
        }
      },
    });
    return { ran: true, ...result };
  }
}
