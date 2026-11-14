import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { SettlementLabelService } from './settlement-label.service';

@Controller('settlement-labels')
export class SettlementLabelController {
  constructor(private readonly labels: SettlementLabelService) {}

  @Get(':runId')
  read(@CurrentUser() user: AuthUser, @Param('runId') runId: string) {
    return this.labels.read({ tenantId: user.tenantId, actorRole: user.role, runId });
  }
}
