import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { CrmService } from './crm.service';

@Controller('crm/sla')
export class CrmSlaController {
  constructor(
    private readonly crm: CrmService,
    private readonly config: ConfigService,
  ) {}

  /** UC-CRM-06 · SCR-AGENT-SLA — overdue / due-soon task board */
  @Get('tasks')
  tasks(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.crm.getSlaTasks(resolveTenantId(this.config, user, tenantHeader));
  }

  /** UC-CRM-06 — log SLA reminder + optional ZNS stub */
  @Post('leads/:leadId/remind')
  @HttpCode(201)
  remind(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('leadId') leadId: string,
    @Body() body: { channel?: 'ZALO' | 'CALL' | 'NOTE'; message?: string },
  ) {
    return this.crm.recordSlaReminder(
      resolveTenantId(this.config, user, tenantHeader),
      leadId,
      body,
      user?.userId,
    );
  }

  /** UC-CRM-06 — escalate to agency manager */
  @Post('leads/:leadId/escalate')
  @HttpCode(201)
  escalate(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('leadId') leadId: string,
    @Body() body: { reason?: string },
  ) {
    return this.crm.recordSlaEscalation(
      resolveTenantId(this.config, user, tenantHeader),
      leadId,
      body,
      user?.userId,
    );
  }
}
