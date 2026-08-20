import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HttpMetricsMiddleware } from './http-metrics.middleware';
import { MetricsController } from './metrics.controller';
import { RequestIdMiddleware } from './request-id.middleware';

@Module({
  controllers: [MetricsController],
})
export class TelemetryModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, HttpMetricsMiddleware).forRoutes('*');
  }
}
