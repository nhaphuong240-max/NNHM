import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ProductionSecurityService } from '../../infrastructure/security/production-security.service';
import { TenantBrandingService } from '../identity/tenant-branding.service';
import { ErpInvoicingService } from '../integrations/erp-invoicing.service';

export const ENTERPRISE_PILOT_TENANT = 'ten_pilot_cdt_01';
export const T7_COMPOSITE_SCORE = 5.0;

/** T7-S8 — enterprise sign-off snapshot for health gate. */
@Injectable()
export class EnterpriseSignoffService {
  constructor(
    private readonly config: ConfigService,
    private readonly branding: TenantBrandingService,
    private readonly erp: ErpInvoicingService,
    private readonly productionSecurity: ProductionSecurityService,
  ) {}

  drDrillStatus() {
    const evidenceRel = 'docs/dev/evidence/t7-dr-failover.log';
    const candidates = [
      join(process.cwd(), evidenceRel),
      join(process.cwd(), '../../', evidenceRel),
    ];
    const evidencePath = candidates.find((p) => existsSync(p)) ?? candidates[0]!;
    const evidencePresent = existsSync(evidencePath);
    let rtoMinutes: number | null = null;
    let rpoMinutes: number | null = null;
    let drillPassed = false;

    if (evidencePresent) {
      const content = readFileSync(evidencePath, 'utf8');
      const rtoMatch = content.match(/RTO[:\s]+(\d+)\s*min/i);
      const rpoMatch = content.match(/RPO[:\s]+(\d+)\s*min/i);
      rtoMinutes = rtoMatch ? Number(rtoMatch[1]) : null;
      rpoMinutes = rpoMatch ? Number(rpoMatch[1]) : null;
      drillPassed = /DRILL\s+PASS|failover\s+PASS/i.test(content);
    }

    return {
      multiRegionEnabled: this.config.get<string>('MULTI_REGION_ENABLED', 'false') === 'true',
      primaryRegion: this.config.get<string>('REGION_ID', 'ap-southeast-1-hcm'),
      drRegion: this.config.get<string>('DR_REGION_ID', 'ap-southeast-1-hn'),
      evidencePresent,
      evidencePath: evidenceRel,
      rtoMinutes,
      rpoMinutes,
      drillPassed,
      targetRtoMinutes: 60,
      targetRpoMinutes: 15,
    };
  }

  async whiteLabelPilotStatus() {
    const brand = await this.branding.getBrand(ENTERPRISE_PILOT_TENANT);
    const tier = brand.data.whiteLabelTier ?? 'STANDARD';
    const customDomain =
      brand.data.customDomain ??
      this.config.get<string>('ENTERPRISE_PILOT_DOMAIN', 'portal.thanglong-dev.vn');

    return {
      tenantId: ENTERPRISE_PILOT_TENANT,
      whiteLabelTier: tier,
      subdomain: brand.data.subdomain,
      customDomain,
      live: brand.data.live,
      displayName: brand.data.displayName,
      enterpriseReady: tier === 'ENTERPRISE' && brand.data.live === true,
    };
  }

  penTestStatus() {
    const checks = this.productionSecurity.getChecks();
    const critical = checks.filter((c) => /^C-/.test(c.id));
    const criticalOpen = critical.filter((c) => !c.ok);
    const externalCandidates = [
      join(process.cwd(), 'docs/security/pen-test-external-T7.md'),
      join(process.cwd(), '../../docs/security/pen-test-external-T7.md'),
    ];
    const externalReport = externalCandidates.find((p) => existsSync(p));
    return {
      criticalTotal: critical.length,
      criticalOpen: criticalOpen.length,
      zeroCritical: criticalOpen.length === 0,
      externalReportPresent: Boolean(externalReport),
      checks: critical,
    };
  }

  scorecardStatus() {
    return {
      composite: T7_COMPOSITE_SCORE,
      target: 5.0,
      tier: 'Enterprise / #1 Vietnam',
      snapshot: 'Jul 2026 T7 refresh',
      doc: 'docs/strategy/WEREAL-Domain-Scorecard.md',
    };
  }

  erpStatus() {
    return this.erp.status();
  }
}
