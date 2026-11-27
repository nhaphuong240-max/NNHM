import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Public } from '../identity/decorators/public.decorator';
import { SandboxEsignOutbox } from './sandbox-esign-outbox';

/** Test-only. Empty or production NODE_ENV leaves this closed. */
@Public()
@Controller('esign-sandbox')
export class EsignSandboxController {
  constructor(private readonly outbox: SandboxEsignOutbox) {}

  @Get('deliveries/:deliveryId')
  read(@Param('deliveryId') deliveryId: string) {
    const signingUrl = this.outbox.get(deliveryId);
    if (!signingUrl) {
      throw new NotFoundException({ detail: 'not found' });
    }
    return { data: { deliveryId, signingUrl } };
  }
}
