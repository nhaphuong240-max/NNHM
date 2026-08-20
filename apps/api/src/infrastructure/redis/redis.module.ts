import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { InventoryLockService } from './inventory-lock.service';
import { RedisConnectionService } from './redis-connection.service';
import { REDIS_CLIENT } from './redis.constants';
import { ScheduleLeaderService } from './schedule-leader.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        return new Redis(url, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
      },
    },
    RedisConnectionService,
    InventoryLockService,
    ScheduleLeaderService,
  ],
  exports: [REDIS_CLIENT, InventoryLockService, RedisConnectionService, ScheduleLeaderService],
})
export class RedisModule {}
