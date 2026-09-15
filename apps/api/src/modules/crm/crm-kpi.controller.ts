import { Controller, Get, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { CrmKpiService } from './crm-kpi.service';

@Controller('crm')
export class CrmKpiController {
  constructor(
    private readonly kpi: CrmKpiService,
    private readonly config: ConfigService,
  ) {}

  /** P0 §0.2(10) — KPI pack SRS §16 */
  @Get('kpi')
  getKpi(@CurrentUser() user: AuthUser, @Query('projectId') projectId?: string) {
    return this.kpi.getKpiPack(resolveTenantId(this.config, user), projectId?.trim() || undefined);
  }

  /** Phase B — weekly KPI + beachhead gate */
  @Get('kpi/weekly')
  getWeeklyKpi(@CurrentUser() user: AuthUser, @Query('projectId') projectId?: string) {
    return this.kpi.getWeeklyKpiPack(
      resolveTenantId(this.config, user),
      projectId?.trim() || undefined,
    );
  }
}
