import {
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { canSendSignLink } from '../identity/role-catalog';
import { resolveSeekerPhone } from '../portal/seeker-phone.util';
import { SignerChannelVerificationService } from './signer-channel-verification.service';

@Controller('esign/channel-verifications')
export class EsignChannelVerificationController {
  constructor(private readonly verifications: SignerChannelVerificationService) {}

  @Post()
  async start(@CurrentUser() user: AuthUser | undefined, @Body() body: { phone?: string }) {
    const tenantId = this.callerTenant(user);
    this.assertCanVerify(user);
    const phone = body.phone?.trim() ?? '';
    if (!phone) {
      throw new UnprocessableEntityException({ detail: 'phone is required' });
    }
    return {
      data: await this.verifications.start(tenantId, phone, {
        actorId: user!.userId,
        role: user!.role,
        seekerPhone: resolveSeekerPhone(user),
      }),
    };
  }

  @Post(':id/confirm')
  async confirm(
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
    @Body() body: { code?: string },
  ) {
    const tenantId = this.callerTenant(user);
    this.assertCanVerify(user);
    if (!body.code?.trim()) {
      throw new UnprocessableEntityException({ detail: 'code is required' });
    }
    return { data: await this.verifications.confirm(tenantId, id, body.code.trim()) };
  }

  private callerTenant(user: AuthUser | undefined): string {
    const tenantId = user?.tenantId?.trim() ?? '';
    if (!tenantId) {
      throw new NotFoundException({ detail: 'not found' });
    }
    return tenantId;
  }

  private assertCanVerify(user: AuthUser | undefined): void {
    if (canSendSignLink(user?.role) || user?.role === 'SEEKER') return;
    throw new ForbiddenException({ detail: 'forbidden' });
  }
}
