import { Body, Controller, HttpCode, Param, Post, UnprocessableEntityException } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { AllocationService } from './allocation.service';

@Controller('allocations')
export class AllocationController {
  constructor(private readonly allocations: AllocationService) {}

  @Post()
  @HttpCode(201)
  grant(
    @CurrentUser() user: AuthUser,
    @Body() body: { agreementId?: string; unitId?: string; expiresAt?: string },
  ) {
    if (typeof body?.expiresAt !== 'string') {
      throw new UnprocessableEntityException({ detail: 'allocation expiry must be in the future' });
    }
    return this.allocations.grant({
      tenantId: user.tenantId,
      actorRole: user.role,
      agreementId: body.agreementId ?? '',
      unitId: body.unitId ?? '',
      expiresAt: new Date(body.expiresAt),
    });
  }

  @Post('placement')
  @HttpCode(200)
  placement(
    @CurrentUser() user: AuthUser,
    @Body() body: { agreementId?: string; unitId?: string },
  ) {
    return this.allocations.placement({
      tenantId: user.tenantId,
      agreementId: body?.agreementId ?? '',
      unitId: body?.unitId ?? '',
      now: new Date(),
    });
  }

  @Post(':allocationId/revoke')
  @HttpCode(200)
  revoke(@CurrentUser() user: AuthUser, @Param('allocationId') allocationId: string) {
    return this.allocations.revoke({
      tenantId: user.tenantId,
      actorRole: user.role,
      allocationId,
    });
  }
}
