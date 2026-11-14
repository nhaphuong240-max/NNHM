import { Body, Controller, HttpCode, Post, UnprocessableEntityException } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { ContractArtifactService } from './contract-artifact.service';

@Controller('contract-artifacts')
export class ContractArtifactController {
  constructor(private readonly artifacts: ContractArtifactService) {}

  @Post()
  @HttpCode(201)
  register(
    @CurrentUser() user: AuthUser,
    @Body() body: { bookingId?: string; templateVersion?: string; status?: string },
  ) {
    if (body?.status === 'EXECUTED') {
      this.artifacts.refuseExecuted();
    }
    if (!body?.bookingId?.trim()) {
      throw new UnprocessableEntityException({ detail: 'booking is required' });
    }
    return this.artifacts.register({
      tenantId: user.tenantId,
      actorRole: user.role,
      bookingId: body.bookingId.trim(),
      templateVersion: body.templateVersion ?? '',
    });
  }
}
