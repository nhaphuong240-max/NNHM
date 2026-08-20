import { Controller, Get } from '@nestjs/common';
import { Public } from '../identity/decorators/public.decorator';
import { HealthService } from './health.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  check() {
    return this.health.check();
  }

  @Get('live')
  live() {
    return this.health.live();
  }

  @Get('ready')
  ready() {
    return this.health.ready();
  }

  @Get('slo')
  slo() {
    return this.health.sloStatus();
  }

  @Get('security')
  security() {
    return this.health.securityGate();
  }

  @Get('observability')
  observability() {
    return this.health.observabilityGate();
  }

  @Get('trust')
  trust() {
    return this.health.trustGate();
  }

  @Get('money')
  money() {
    return this.health.moneyGate();
  }

  @Get('network')
  network() {
    return this.health.networkGate();
  }

  @Get('intelligence')
  intelligence() {
    return this.health.intelligenceGate();
  }

  @Get('enterprise')
  enterprise() {
    return this.health.enterpriseGate();
  }
}
