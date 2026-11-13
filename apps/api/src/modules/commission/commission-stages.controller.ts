import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { CommissionStagesService } from './commission-stages.service';

@Controller('commission-stages')
export class CommissionStagesController {
  constructor(private readonly stages: CommissionStagesService) {}

  @Get(':entryId')
  read(@CurrentUser() user: AuthUser, @Param('entryId') entryId: string) {
    return this.stages.read({ tenantId: user.tenantId, actorRole: user.role, entryId });
  }
}
