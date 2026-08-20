import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { BookingWorkflowService } from './booking-workflow.service';
import type { BookingWorkflowDefinition } from './booking-workflow.util';

@Controller('bookings/workflows')
export class BookingWorkflowController {
  constructor(
    private readonly workflow: BookingWorkflowService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  get(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.workflow.getWorkflow(resolveTenantId(this.config, user, tenantHeader));
  }

  @Post()
  @HttpCode(200)
  save(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      name?: string;
      states?: BookingWorkflowDefinition['states'];
      transitions?: BookingWorkflowDefinition['transitions'];
    },
  ) {
    return this.workflow.saveDraft(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Post('publish')
  @HttpCode(200)
  publish(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.workflow.publish(
      resolveTenantId(this.config, user, tenantHeader),
      user?.userId,
    );
  }
}
