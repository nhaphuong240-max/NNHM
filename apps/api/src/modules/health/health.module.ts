import { Module } from '@nestjs/common';
import { AiAnomalyModule } from '../ai-anomaly/ai-anomaly.module';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { AnchorModule } from '../anchor/anchor.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { EnterpriseModule } from '../enterprise/enterprise.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [AnchorModule, AnalyticsModule, AiGatewayModule, AiAnomalyModule, EnterpriseModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
