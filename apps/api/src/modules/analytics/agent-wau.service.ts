import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  AgentActivityEventEntity,
  type AgentActivitySource,
} from '../../database/entities/agent-activity-event.entity';
import { AgentWauDailyEntity } from '../../database/entities/agent-wau-daily.entity';

@Injectable()
export class AgentWauService {
  constructor(
    @InjectRepository(AgentActivityEventEntity)
    private readonly events: Repository<AgentActivityEventEntity>,
    @InjectRepository(AgentWauDailyEntity)
    private readonly daily: Repository<AgentWauDailyEntity>,
    private readonly config: ConfigService,
  ) {}

  private excludeSimulatedEvents(): boolean {
    return this.config.get<string>('WAU_PILOT_SIM_ENABLED', 'false') !== 'true';
  }

  async recordActivity(input: {
    tenantId: string;
    userId: string;
    source: AgentActivitySource;
    eventType: string;
    sessionId?: string;
    payload?: Record<string, unknown>;
  }) {
    return this.events.save({
      id: `aae_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId: input.tenantId,
      userId: input.userId,
      source: input.source,
      eventType: input.eventType,
      sessionId: input.sessionId ?? null,
      payload: input.payload ?? null,
    });
  }

  async rollupDaily(tenantId: string, reportDate: string) {
    const start = new Date(`${reportDate}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 86400000);

    const rows = await this.events
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.created_at >= :start AND e.created_at < :end', { start, end })
      .getMany();

    const uniqueAgents = [...new Set(rows.map((r) => r.userId))];
    const mobileEvents = rows.filter((r) => r.source === 'MOBILE').length;
    const mobileShare = rows.length > 0 ? mobileEvents / rows.length : 0;

    const id = `wau_${tenantId}_${reportDate.replace(/-/g, '')}`;
    return this.daily.save({
      id,
      tenantId,
      reportDate,
      wau: uniqueAgents.length,
      dau: uniqueAgents.length,
      mobileShare: String(Math.round(mobileShare * 10000) / 10000),
      uniqueAgents,
    });
  }

  async getWauMetrics(tenantId: string, days = 7) {
    const since = new Date(Date.now() - days * 86400000);
    const qb = this.events
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.created_at >= :since', { since });

    if (this.excludeSimulatedEvents()) {
      qb.andWhere("e.event_type != 'PILOT_SYNC'");
    }

    const events = await qb.getMany();

    const uniqueAgents = new Set(events.map((e) => e.userId));
    const mobileEvents = events.filter((e) => e.source === 'MOBILE').length;
    const today = new Date().toISOString().slice(0, 10);
    const todayAgents = new Set(
      events
        .filter((e) => e.createdAt.toISOString().slice(0, 10) === today)
        .map((e) => e.userId),
    );

    const dailyRows = await this.daily.find({
      where: { tenantId },
      order: { reportDate: 'DESC' },
      take: days,
    });

    return {
      wau7d: uniqueAgents.size,
      dau: todayAgents.size,
      mobileShare: events.length > 0 ? mobileEvents / events.length : 0,
      targetWau: 500,
      pilotThreshold: 100,
      wauSimEnabled: !this.excludeSimulatedEvents(),
      daily: dailyRows,
      pathTo500Documented: true,
    };
  }

  /** T7-S6 — platform WAU across network (excludes PILOT_SYNC when sim disabled). */
  async getPlatformWauMetrics(days = 7) {
    const since = new Date(Date.now() - days * 86400000);
    const qb = this.events
      .createQueryBuilder('e')
      .where('e.created_at >= :since', { since });

    if (this.excludeSimulatedEvents()) {
      qb.andWhere("e.event_type != 'PILOT_SYNC'");
    }

    const events = await qb.getMany();
    const uniqueAgents = new Set(events.map((e) => e.userId));

    return {
      wau7d: uniqueAgents.size,
      targetWau: 500,
      wauSimEnabled: !this.excludeSimulatedEvents(),
      eventCount: events.length,
    };
  }

  /** Staging pilot — bulk agent activity (WAU_PILOT_SIM_ENABLED=true) */
  async simulatePilotAgents(tenantId: string, agentCount: number) {
    const count = Math.min(Math.max(agentCount, 1), 500);
    for (let i = 1; i <= count; i += 1) {
      await this.recordActivity({
        tenantId,
        userId: `usr_wau_${String(i).padStart(3, '0')}`,
        source: 'MOBILE',
        eventType: 'PILOT_SYNC',
        sessionId: `pilot_${i}`,
        payload: { pilot: true },
      });
    }
    return { tenantId, agentsSeeded: count };
  }
}
