import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { ScheduleLeaderService } from '../../infrastructure/redis/schedule-leader.service';
import { DataIntelligenceService } from './data-intelligence.service';

@Injectable()
export class DataMartJob {
  private readonly logger = new Logger(DataMartJob.name);

  constructor(
    private readonly intelligence: DataIntelligenceService,
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    private readonly scheduleLeader: ScheduleLeaderService,
  ) {}

  @Cron('0 30 2 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async handleCron() {
    if (!(await this.scheduleLeader.isLeader('data-mart-daily', 3600))) return;
    await this.runDailyMart();
  }

  async runDailyMart() {
    const rows = await this.tenants.find({ where: { isActive: true } });
    for (const tenant of rows) {
      await this.intelligence.buildDailyMart(tenant.id);
      this.logger.log(`Data mart built tenant=${tenant.id}`);
    }
  }
}
