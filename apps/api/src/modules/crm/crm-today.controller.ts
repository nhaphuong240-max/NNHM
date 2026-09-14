import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { CrmHotSlaService } from './crm-hot-sla.service';

@Controller('crm')
export class CrmTodayController {
  constructor(
    private readonly hotSla: CrmHotSlaService,
    private readonly config: ConfigService,
  ) {}

  /** P0 FR-LEAD-008 — Today KPI + HOT queue */
  @Get('today')
  getToday(@CurrentUser() user: AuthUser) {
    const tenantId = resolveTenantId(this.config, user);
    const agentId = user.role === 'AGENT' ? user.userId : undefined;
    return this.hotSla.getToday(tenantId, agentId);
  }

  /** P0 — escalate HOT lead (reassign assignee) */
  @Post('sla/leads/:leadId/escalate')
  escalate(
    @CurrentUser() user: AuthUser,
    @Param('leadId') leadId: string,
    @Body() body: { reason?: string },
  ) {
    const tenantId = resolveTenantId(this.config, user);
    return this.hotSla.escalateHotLead(tenantId, leadId, user.userId, body.reason);
  }

  /** P0 — mark first touch (call/WhatsApp logged) */
  @Post('sla/leads/:leadId/first-touch')
  firstTouch(@CurrentUser() user: AuthUser, @Param('leadId') leadId: string) {
    const tenantId = resolveTenantId(this.config, user);
    return this.hotSla.recordFirstTouch(tenantId, leadId, user.userId);
  }
}
