import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { CommissionExportService } from './commission-export.service';
import { CommissionSettlementSchedulerService } from './commission-settlement-scheduler.service';
import { CommissionPolicyService } from './commission-policy.service';
import { CommissionSettlementService } from './commission-settlement.service';
import type { ApproveLinesInput, CreatePolicyInput, CreateSettlementRunInput, OpenHoldbackInput, UpdatePolicyInput } from './commission.types';
import { CommissionSnapshotService } from './commission-snapshot.service';

@Controller('commission')
export class CommissionController {
  constructor(
    private readonly policy: CommissionPolicyService,
    private readonly snapshot: CommissionSnapshotService,
    private readonly settlement: CommissionSettlementService,
    private readonly exportService: CommissionExportService,
    private readonly settlementScheduler: CommissionSettlementSchedulerService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status() {
    return this.policy.status();
  }

  @Get('policies')
  listPolicies(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('projectId') projectId?: string,
  ) {
    return this.policy.list(resolveTenantId(this.config, user, tenantHeader), projectId?.trim());
  }

  @Get('policies/:policyId')
  getPolicy(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('policyId') policyId: string,
  ) {
    return this.policy.get(resolveTenantId(this.config, user, tenantHeader), policyId);
  }

  @Post('policies')
  @HttpCode(201)
  createPolicy(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: CreatePolicyInput,
  ) {
    return this.policy.createDraft(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Patch('policies/:policyId')
  updatePolicy(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('policyId') policyId: string,
    @Body() body: UpdatePolicyInput,
  ) {
    return this.policy.updateDraft(
      resolveTenantId(this.config, user, tenantHeader),
      policyId,
      body,
      user?.userId,
    );
  }

  @Post('policies/:policyId/publish')
  publishPolicy(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('policyId') policyId: string,
  ) {
    return this.policy.publish(
      resolveTenantId(this.config, user, tenantHeader),
      policyId,
      user?.userId,
    );
  }

  @Get('disputes')
  listDisputes(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('status') status?: string,
  ) {
    return this.snapshot.listDisputes(
      resolveTenantId(this.config, user, tenantHeader),
      status?.trim(),
    );
  }

  @Get('snapshots')
  listSnapshots(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('bookingId') bookingId?: string,
  ) {
    return this.snapshot.list(
      resolveTenantId(this.config, user, tenantHeader),
      bookingId?.trim(),
    );
  }

  @Get('snapshots/:snapshotId')
  getSnapshot(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('snapshotId') snapshotId: string,
  ) {
    return this.snapshot.get(resolveTenantId(this.config, user, tenantHeader), snapshotId);
  }

  /** UC-COM-02 — close deal → immutable snapshot */
  @Post('deals/:bookingId/close')
  @HttpCode(201)
  closeDeal(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
  ) {
    return this.snapshot.closeDeal(
      resolveTenantId(this.config, user, tenantHeader),
      bookingId,
      user?.userId,
    );
  }

  /** UC-COM-04 — dispute holdback */
  @Post('snapshots/:snapshotId/holdback')
  @HttpCode(201)
  openHoldback(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('snapshotId') snapshotId: string,
    @Body() body: OpenHoldbackInput,
  ) {
    return this.snapshot.openHoldback(
      resolveTenantId(this.config, user, tenantHeader),
      snapshotId,
      body,
      user?.userId,
    );
  }

  @Post('snapshots/:snapshotId/holdback/:disputeId/resolve')
  resolveHoldback(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('snapshotId') snapshotId: string,
    @Param('disputeId') disputeId: string,
  ) {
    return this.snapshot.resolveHoldback(
      resolveTenantId(this.config, user, tenantHeader),
      snapshotId,
      disputeId,
      user?.userId,
    );
  }

  /** UC-COM-03 — payable lines queue */
  @Get('settlement/status')
  settlementStatus() {
    return this.settlement.status();
  }

  @Get('lines')
  listLines(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('payoutStatus') payoutStatus?: string,
  ) {
    return this.settlement.listLines(
      resolveTenantId(this.config, user, tenantHeader),
      payoutStatus?.trim(),
    );
  }

  /** UC-COM-03 — approve lines before settlement */
  @Post('lines/approve')
  @HttpCode(200)
  approveLines(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: ApproveLinesInput,
  ) {
    return this.settlement.approveLines(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  /** UC-PAY-04 — settlement runs */
  @Get('settlement/runs')
  listSettlementRuns(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.settlement.listRuns(resolveTenantId(this.config, user, tenantHeader));
  }

  @Get('settlement/runs/:runId')
  getSettlementRun(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('runId') runId: string,
  ) {
    return this.settlement.getRun(resolveTenantId(this.config, user, tenantHeader), runId);
  }

  @Post('settlement/runs')
  @HttpCode(201)
  createSettlementRun(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: CreateSettlementRunInput,
  ) {
    return this.settlement.createRun(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  /** OPS-S5-05 — reconcile payout batch vs bank statement */
  @Post('settlement/runs/:runId/reconcile')
  @HttpCode(200)
  reconcilePayoutBatch(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('runId') runId: string,
    @Body() body: { batchId: string; bankAmount: number },
  ) {
    return this.settlement.reconcilePayoutBatch(
      resolveTenantId(this.config, user, tenantHeader),
      runId,
      body,
    );
  }

  /** UC-PAY-04 · SCR-FIN-006 — settlement batch scheduler */
  @Get('settlement/schedule')
  getSettlementSchedule(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.settlementScheduler.getSchedule(
      resolveTenantId(this.config, user, tenantHeader),
    );
  }

  @Post('settlement/schedule')
  @HttpCode(200)
  updateSettlementSchedule(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: { enabled?: boolean; minReadyLines?: number; cronLabel?: string },
  ) {
    return this.settlementScheduler.updateSchedule(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Post('settlement/schedule/run')
  @HttpCode(200)
  runSettlementSchedule(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.settlementScheduler.runScheduledBatch(
      resolveTenantId(this.config, user, tenantHeader),
      user?.userId,
    );
  }

  /** UC-COM-05 — accounting CSV */
  @Get('export.csv')
  async exportCsv(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Res() res: Response,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const csv = await this.exportService.exportCsv(tenantId, dateFrom?.trim(), dateTo?.trim());
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="commission-export.csv"');
    res.send(csv);
  }

  /** UC-COM-05 — async export job queue */
  @Post('export/jobs')
  @HttpCode(201)
  createExportJob(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { dateFrom?: string; dateTo?: string },
  ) {
    return this.exportService.createExportJob(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Get('export/jobs')
  listExportJobs(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.exportService.listExportJobs(resolveTenantId(this.config, user, tenantHeader));
  }

  @Get('export/jobs/:jobId')
  getExportJob(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('jobId') jobId: string,
  ) {
    return this.exportService.getExportJob(
      resolveTenantId(this.config, user, tenantHeader),
      jobId,
    );
  }

  @Get('export/jobs/:jobId/download')
  async downloadExportJob(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const result = await this.exportService.downloadExportJob(tenantId, jobId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="commission-export-${jobId}.csv"`);
    res.send(result.data.csv);
  }
}
