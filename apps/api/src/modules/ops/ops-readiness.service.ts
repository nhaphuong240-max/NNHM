import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { join } from 'path';

/** OPS-S6-01 — Grafana staging, on-call roster, incident drill evidence for G-OPS-4. */
@Injectable()
export class OpsReadinessService {
  constructor(private readonly config: ConfigService) {}

  snapshot() {
    const grafanaUrl = this.config.get<string>(
      'GRAFANA_STAGING_URL',
      'https://grafana.staging.wereal.vn',
    );
    const grafanaAlertsEnabled =
      this.config.get<string>('GRAFANA_ALERTS_ENABLED', 'false') === 'true';
    const onCallRoster = this.config.get<string>('ONCALL_ROSTER', 'L1→Finance→TechLead');
    const onCallDoc = 'docs/ops/on-call-roster-ops90.md';
    const grafanaImportDoc = 'docs/ops/grafana/ops-s6-staging-import.md';

    const drillCandidates = [
      join(process.cwd(), 'docs/dev/evidence/ops-s6-incident-drill.log'),
      join(process.cwd(), '../../docs/dev/evidence/ops-s6-incident-drill.log'),
    ];
    const drillEvidencePath = drillCandidates.find((p) => existsSync(p));
    const incidentDrillComplete = Boolean(drillEvidencePath);

    return {
      data: {
        grafana: {
          stagingUrl: grafanaUrl,
          alertsEnabled: grafanaAlertsEnabled,
          dashboardPath: 'docs/ops/grafana/dashboards/wereal-api-health.json',
          alertsPath: 'docs/ops/grafana/alerts/wereal-slo-alerts.yml',
          importRunbook: grafanaImportDoc,
        },
        onCall: {
          roster: onCallRoster,
          rosterDoc: onCallDoc,
          escalation: 'L1 (15m ack) → L2 Finance → L3 Tech Lead',
          slackChannel: '#wereal-ops',
        },
        incidentDrill: {
          complete: incidentDrillComplete,
          evidencePath: drillEvidencePath
            ? 'docs/dev/evidence/ops-s6-incident-drill.log'
            : null,
          script: 'scripts/ops-incident-drill.sh',
          runbook: 'docs/runbooks/payment-webhook.md',
        },
        contractGate: {
          openapiPath: 'openapi.yaml',
          validateScript: 'scripts/contract/validate-openapi.sh',
          routeCoverageScript: 'scripts/contract/validate-route-coverage.mjs',
        },
        sprint: 'S6',
        gate: 'G-OPS-4',
      },
      meta: { uc: ['OPS-S6-01', 'OPS-S6-04', 'OPS-S6-05'] },
    };
  }
}
