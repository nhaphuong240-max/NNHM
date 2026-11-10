import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { PublicTokenTenantGuard } from '../../common/public-token-tenant.guard';
import { Public } from './decorators/public.decorator';
import { SeekerAuthService } from './seeker-auth.service';

@Controller('auth/seeker')
export class SeekerAuthController {
  constructor(private readonly seeker: SeekerAuthService) {}

  @Public()
  @UseGuards(PublicTokenTenantGuard)
  @Post('otp/request')
  requestOtp(
    @Req() request: { tenantId: string },
    @Body() body: { phone: string; visitorId?: string; entryToken?: string },
  ) {
    return this.seeker.requestOtp(request.tenantId, body.phone, body.visitorId, body.entryToken);
  }

  @Public()
  @UseGuards(PublicTokenTenantGuard)
  @Post('otp/verify')
  verifyOtp(
    @Req() request: { tenantId: string },
    @Body()
    body: {
      challengeId: string;
      code: string;
      phone: string;
      visitorId?: string;
      fullName?: string;
    },
  ) {
    return this.seeker.verifyOtp(request.tenantId, body);
  }
}
