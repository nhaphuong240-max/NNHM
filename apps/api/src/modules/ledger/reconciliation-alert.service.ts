import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ReconciliationReportEntity } from '../../database/entities/reconciliation-report.entity';
import { AuditService } from '../audit/audit.service';

export interface ReconciliationAlertResult {
  email: { status: 'STUB_SENT'; to: string };
  webhook: { status: 'DELIVERED' | 'STUB_LOGGED' | 'FAILED'; target?: string; error?: string };
}

/** P3-S3-03 · UC-PAY-02 — ops notification stub on reconcile MISMATCH */
@Injectable()
export class ReconciliationAlertService {
  private readonly logger = new Logger(ReconciliationAlertService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async notifyMismatch(
    tenantId: string,
    report: ReconciliationReportEntity,
  ): Promise<ReconciliationAlertResult> {
    const opsEmail =
      this.config.get<string>('OPS_ALERT_EMAIL')?.trim() || 'ops@wereal.dev';
    const webhookUrl = this.config.get<string>('OPS_RECONCILE_WEBHOOK_URL')?.trim();

    this.logger.warn(
      `reconciliation_alert MISMATCH tenant=${tenantId} date=${report.reportDate} gateway=${report.gatewayTotal} ledger=${report.ledgerTotal} discrepancies=${report.discrepancies.length}`,
    );

    const payload = {
      tenantId,
      reportDate: report.reportDate,
      status: report.status,
      gatewayTotal: Number(report.gatewayTotal),
      ledgerTotal: Number(report.ledgerTotal),
      discrepancyCount: report.discrepancies.length,
      discrepancies: report.discrepancies.slice(0, 10),
    };

    await this.audit.append({
      tenantId,
      entityType: 'reconciliation_alert',
      entityId: report.id,
      action: 'MISMATCH',
      payload: {
        channels: { email: opsEmail, webhook: webhookUrl ?? 'stub' },
        ...payload,
      },
    });

    this.logger.log(
      `reconciliation_email_stub to=${opsEmail} subject=[WEREAL] Reconcile MISMATCH ${report.reportDate} tenant=${tenantId}`,
    );

    let webhook: ReconciliationAlertResult['webhook'];
    if (webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Wereal-Event': 'reconciliation.mismatch',
          },
          body: JSON.stringify({
            event: 'reconciliation.mismatch',
            createdAt: new Date().toISOString(),
            data: payload,
          }),
          signal: AbortSignal.timeout(8000),
        });
        webhook = res.ok
          ? { status: 'DELIVERED', target: webhookUrl }
          : { status: 'FAILED', target: webhookUrl, error: `HTTP ${res.status}` };
      } catch (err) {
        webhook = {
          status: 'FAILED',
          target: webhookUrl,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    } else {
      this.logger.log(
        `reconciliation_webhook_stub event=reconciliation.mismatch tenant=${tenantId} date=${report.reportDate}`,
      );
      webhook = { status: 'STUB_LOGGED' };
    }

    return {
      email: { status: 'STUB_SENT', to: opsEmail },
      webhook,
    };
  }
}
