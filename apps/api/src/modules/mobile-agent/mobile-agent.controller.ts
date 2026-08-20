import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { MobileAgentService } from './mobile-agent.service';
import type {
  PushStubInput,
  RegisterDeviceInput,
  SyncActivitiesInput,
} from './mobile-agent.types';

@Controller('mobile')
export class MobileAgentController {
  constructor(
    private readonly mobile: MobileAgentService,
    private readonly config: ConfigService,
  ) {}

  /** UC-UX-01 — register Expo push token */
  @Post('devices/register')
  @HttpCode(201)
  registerDevice(
    @CurrentUser() user: AuthUser | undefined,
    @Body() body: RegisterDeviceInput,
  ) {
    const tenantId = resolveTenantId(this.config, user);
    const userId = user?.userId ?? 'anonymous';
    return this.mobile.registerDevice(tenantId, userId, body);
  }

  @Get('devices')
  listDevices(@CurrentUser() user: AuthUser | undefined) {
    const tenantId = resolveTenantId(this.config, user);
    const userId = user?.userId ?? 'anonymous';
    return this.mobile.listDevices(tenantId, userId);
  }

  /** UC-UX-01 — flush offline activity queue (GPS check-ins) */
  @Post('activities/sync')
  @HttpCode(200)
  syncActivities(
    @CurrentUser() user: AuthUser | undefined,
    @Body() body: SyncActivitiesInput,
  ) {
    const tenantId = resolveTenantId(this.config, user);
    const userId = user?.userId ?? 'anonymous';
    return this.mobile.syncActivities(tenantId, userId, body);
  }

  /** UC-UX-01 · UC-CRM-06 — pilot push delivery stub */
  @Post('notifications/stub')
  @HttpCode(200)
  pushStub(@CurrentUser() user: AuthUser | undefined, @Body() body: PushStubInput) {
    const tenantId = resolveTenantId(this.config, user);
    const userId = user?.userId ?? 'anonymous';
    return this.mobile.sendPushStub(tenantId, userId, body);
  }

  /** T5-S2 — real mobile WAU heartbeat (no PILOT_SYNC) */
  @Post('activity')
  @HttpCode(200)
  recordActivity(
    @CurrentUser() user: AuthUser | undefined,
    @Body() body: { eventType?: string; payload?: Record<string, unknown> },
  ) {
    const tenantId = resolveTenantId(this.config, user);
    const userId = user?.userId ?? 'anonymous';
    return this.mobile.recordMobileActivity(
      tenantId,
      userId,
      body.eventType ?? 'APP_SESSION',
      body.payload,
    );
  }
}
