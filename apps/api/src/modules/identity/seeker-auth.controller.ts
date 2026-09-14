import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from './decorators/public.decorator';
import { SeekerAuthService } from './seeker-auth.service';

@Controller('auth/seeker')
export class SeekerAuthController {
  constructor(
    private readonly seeker: SeekerAuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('otp/request')
  requestOtp(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { phone: string; visitorId?: string },
  ) {
    const tenantId = resolveTenantId(this.config, undefined, tenantHeader);
    return this.seeker.requestOtp(tenantId, body.phone, body.visitorId);
  }

  @Public()
  @Post('otp/verify')
  verifyOtp(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      challengeId: string;
      code: string;
      phone: string;
      visitorId?: string;
      fullName?: string;
    },
  ) {
    const tenantId = resolveTenantId(this.config, undefined, tenantHeader);
    return this.seeker.verifyOtp(tenantId, body);
  }
}
