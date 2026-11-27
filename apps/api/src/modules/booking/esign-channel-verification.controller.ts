import { Body, Controller, Headers, Param, Post, UnprocessableEntityException } from '@nestjs/common';
import { Public } from '../identity/decorators/public.decorator';
import { SignerChannelVerificationService } from './signer-channel-verification.service';

@Controller('esign/channel-verifications')
export class EsignChannelVerificationController {
  constructor(private readonly verifications: SignerChannelVerificationService) {}

  @Public()
  @Post()
  async start(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { phone?: string },
  ) {
    const tenantId = tenantHeader?.trim() ?? '';
    const phone = body.phone?.trim() ?? '';
    if (!tenantId || !phone) {
      throw new UnprocessableEntityException({ detail: 'tenant and phone are required' });
    }
    return { data: await this.verifications.start(tenantId, phone) };
  }

  @Public()
  @Post(':id/confirm')
  async confirm(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('id') id: string,
    @Body() body: { code?: string },
  ) {
    const tenantId = tenantHeader?.trim() ?? '';
    if (!tenantId || !body.code?.trim()) {
      throw new UnprocessableEntityException({ detail: 'tenant and code are required' });
    }
    return { data: await this.verifications.confirm(tenantId, id, body.code.trim()) };
  }
}
