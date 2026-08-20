import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../../modules/identity/decorators/public.decorator';
import { metricsPayload } from '../telemetry/prometheus.registry';

@Public()
@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics() {
    if (process.env.PROMETHEUS_ENABLED === 'false') {
      return '# prometheus disabled\n';
    }
    return metricsPayload();
  }
}
