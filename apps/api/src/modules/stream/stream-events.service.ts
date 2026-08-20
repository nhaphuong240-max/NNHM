import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type Redis from 'ioredis';
import { Observable } from 'rxjs';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.constants';
import type { StreamEnvelope, UnitStatusEvent } from './stream.types';

@Injectable()
export class StreamEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StreamEventsService.name);
  private subscriber?: Redis;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleInit() {
    this.subscriber = this.redis.duplicate();
    try {
      await this.subscriber.connect();
    } catch {
      this.logger.warn('Redis subscriber unavailable — SSE fan-out disabled');
    }
  }

  async onModuleDestroy() {
    await this.subscriber?.quit();
  }

  channel(tenantId: string): string {
    return `${tenantId}:stream:units`;
  }

  async publish(tenantId: string, envelope: StreamEnvelope): Promise<void> {
    try {
      await this.redis.publish(this.channel(tenantId), JSON.stringify(envelope));
    } catch {
      this.logger.warn(`Failed to publish ${envelope.event} for tenant ${tenantId}`);
    }
  }

  async publishUnitStatus(tenantId: string, data: UnitStatusEvent): Promise<void> {
    await this.publish(tenantId, { event: 'unit.status.changed', data });
  }

  subscribeUnits(tenantId: string): Observable<MessageEvent> {
    const channel = this.channel(tenantId);

    return new Observable<MessageEvent>((observer) => {
      if (!this.subscriber) {
        observer.error(new Error('Redis subscriber not connected'));
        return;
      }

      const onMessage = (ch: string, message: string) => {
        if (ch !== channel) return;
        try {
          const envelope = JSON.parse(message) as StreamEnvelope;
          observer.next({
            type: envelope.event,
            data: envelope.data,
          });
        } catch {
          observer.next({ data: message });
        }
      };

      void this.subscriber.subscribe(channel).then(() => {
        this.subscriber!.on('message', onMessage);
        observer.next({
          type: 'connected',
          data: { tenantId, channel, timestamp: new Date().toISOString() },
        });
      });

      return () => {
        this.subscriber?.off('message', onMessage);
        void this.subscriber?.unsubscribe(channel);
      };
    });
  }
}
