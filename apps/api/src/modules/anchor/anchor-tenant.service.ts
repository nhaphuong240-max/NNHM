import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Repository, In } from 'typeorm';
import {
  AnchorOnboardingStatus,
  AnchorPilotClass,
  AnchorTenantProfileEntity,
} from '../../database/entities/anchor-tenant-profile.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { DistributionPolicyEntity } from '../../database/entities/distribution-policy.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { DeveloperTrustScoreService } from '../golden-record/developer-trust-score.service';

export const LIVE_PILOT_CDT = {
  tenantId: 'ten_pilot_cdt_01',
  legalName: 'Công ty CP BĐS Thăng Long',
  displayName: 'CĐT Thăng Long (Pilot)',
  projectId: 'prj_thanglong_01',
  slaPackVersion: '2026-T5-v1',
  trustScoreMin: 80,
  crossAnchorProjects: ['prj_sunrise'] as string[],
};

/** T7-S6 — additive LIVE CĐT pilots (parallel synthetic anchors). */
export const LIVE_PILOT_ANCHORS: Array<{
  tenantId: string;
  legalName: string;
  displayName: string;
  projectId: string;
  slaPackVersion: string;
  trustScoreMin: number;
  crossAnchorProjects: string[];
}> = [
  LIVE_PILOT_CDT,
  {
    tenantId: 'ten_pilot_cdt_02',
    legalName: 'Công ty CP NovaLand Pilot',
    displayName: 'CĐT NovaLand (Pilot #2)',
    projectId: 'prj_novaland_02',
    slaPackVersion: '2026-T5-v1',
    trustScoreMin: 80,
    crossAnchorProjects: ['prj_sunrise'],
  },
  {
    tenantId: 'ten_pilot_cdt_03',
    legalName: 'Công ty CP GreenCity Pilot',
    displayName: 'CĐT GreenCity (Pilot #3)',
    projectId: 'prj_greencity_03',
    slaPackVersion: '2026-T5-v1',
    trustScoreMin: 80,
    crossAnchorProjects: ['prj_metro_02'],
  },
];

export const ANCHOR_TENANT_SEEDS = [
  {
    tenantId: 'ten_dev_01',
    displayName: 'Sunrise Dev Anchor',
    projectIds: ['prj_sunrise'],
    pilotClass: 'SYNTHETIC' as AnchorPilotClass,
  },
  {
    tenantId: 'ten_anchor_02',
    displayName: 'Metro Tower Anchor',
    projectIds: ['prj_metro_02'],
    pilotClass: 'SYNTHETIC' as AnchorPilotClass,
  },
  {
    tenantId: 'ten_anchor_03',
    displayName: 'Green Park Anchor',
    projectIds: ['prj_green_03'],
    pilotClass: 'SYNTHETIC' as AnchorPilotClass,
  },
];

export type AnchorProfileDto = {
  tenantId: string;
  displayName: string;
  legalName: string | null;
  tier: string;
  pilotClass: AnchorPilotClass;
  onboardingStatus: AnchorOnboardingStatus;
  projectIds: string[];
  slaPackVersion: string;
  trustScoreMin: number;
  onboardedAt: string | null;
};

export type PilotOnboardingChecklist = {
  tenantId: string;
  pilotClass: AnchorPilotClass;
  steps: {
    grImport: boolean;
    trustScore: boolean;
    slaSigned: boolean;
    distributionPublished: boolean;
    crossAnchorLinked: boolean;
  };
  trustScores: Array<{ projectId: string; score: number }>;
  ready: boolean;
};

export type OnboardLivePilotInput = {
  tenantId?: string;
  legalName?: string;
  displayName?: string;
  projectIds?: string[];
};

@Injectable()
export class AnchorTenantService {
  constructor(
    @InjectRepository(AnchorTenantProfileEntity)
    private readonly profiles: Repository<AnchorTenantProfileEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(DistributionPolicyEntity)
    private readonly distributionPolicies: Repository<DistributionPolicyEntity>,
    private readonly trustScore: DeveloperTrustScoreService,
  ) {}

  loadPilotConfigFromDisk() {
    const candidates = [
      join(process.cwd(), 'config/gtm/pilot-cdt-v1.json'),
      join(process.cwd(), '../../config/gtm/pilot-cdt-v1.json'),
    ];
    for (const path of candidates) {
      try {
        return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
      } catch {
        /* try next path */
      }
    }
    return null;
  }

  private mapProfile(row: AnchorTenantProfileEntity): AnchorProfileDto {
    return {
      tenantId: row.tenantId,
      displayName: row.displayName,
      legalName: row.legalName,
      tier: row.tier,
      pilotClass: row.pilotClass ?? 'SYNTHETIC',
      onboardingStatus: row.onboardingStatus ?? 'ACTIVE',
      projectIds: row.projectIds,
      slaPackVersion: row.slaPackVersion,
      trustScoreMin: row.trustScoreMin,
      onboardedAt: row.onboardedAt?.toISOString() ?? null,
    };
  }

  async ensureSeedAnchors() {
    for (const seed of ANCHOR_TENANT_SEEDS) {
      const existing = await this.profiles.findOne({ where: { tenantId: seed.tenantId } });
      if (existing) {
        if (existing.pilotClass === 'LIVE') continue;
        const patch: Partial<AnchorTenantProfileEntity> = {};
        if (!existing.pilotClass) patch.pilotClass = seed.pilotClass;
        if (!existing.onboardingStatus) patch.onboardingStatus = 'ACTIVE';
        if (seed.tenantId === 'ten_dev_01' && existing.projectIds.includes('prj_sunrise_01')) {
          patch.projectIds = seed.projectIds;
        }
        if (Object.keys(patch).length > 0) {
          await this.profiles.update({ id: existing.id }, patch);
        }
        continue;
      }
      await this.profiles.save({
        id: `anc_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
        tenantId: seed.tenantId,
        tier: 'ANCHOR',
        projectIds: seed.projectIds,
        slaPackVersion: '2026-T5-v1',
        trustScoreMin: 80,
        displayName: seed.displayName,
        legalName: null,
        pilotClass: seed.pilotClass,
        onboardingStatus: 'ACTIVE',
        onboardedAt: new Date(),
      });
    }
  }

  async ensureAllLivePilotProfiles() {
    for (const pilot of LIVE_PILOT_ANCHORS) {
      await this.ensureLivePilotProfile({
        tenantId: pilot.tenantId,
        legalName: pilot.legalName,
        displayName: pilot.displayName,
        projectIds: [pilot.projectId],
      });
    }
  }

  async ensureLivePilotProfile(input: OnboardLivePilotInput = {}) {
    const disk = this.loadPilotConfigFromDisk();
    const tenantId =
      input.tenantId ?? (disk?.tenantId as string | undefined) ?? LIVE_PILOT_CDT.tenantId;
    const displayName =
      input.displayName ??
      (disk?.displayName as string | undefined) ??
      LIVE_PILOT_CDT.displayName;
    const legalName =
      input.legalName ?? (disk?.legalName as string | undefined) ?? LIVE_PILOT_CDT.legalName;
    const projectIds =
      input.projectIds ??
      [(disk?.projectId as string | undefined) ?? LIVE_PILOT_CDT.projectId];

    const existing = await this.profiles.findOne({ where: { tenantId } });
    if (existing) {
      await this.profiles.update(
        { id: existing.id },
        {
          tier: 'ANCHOR',
          displayName,
          legalName,
          pilotClass: 'LIVE',
          onboardingStatus: 'SIGNED',
          projectIds,
          slaPackVersion: LIVE_PILOT_CDT.slaPackVersion,
          trustScoreMin: LIVE_PILOT_CDT.trustScoreMin,
          onboardedAt: existing.onboardedAt ?? new Date(),
        },
      );
      return this.profiles.findOneOrFail({ where: { tenantId } });
    }

    return this.profiles.save({
      id: `anc_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      tier: 'ANCHOR',
      displayName,
      legalName,
      pilotClass: 'LIVE',
      onboardingStatus: 'SIGNED',
      projectIds,
      slaPackVersion: LIVE_PILOT_CDT.slaPackVersion,
      trustScoreMin: LIVE_PILOT_CDT.trustScoreMin,
      onboardedAt: new Date(),
    });
  }

  async onboardLivePilot(input: OnboardLivePilotInput = {}) {
    const profile = await this.ensureLivePilotProfile(input);
    const checklist = await this.getOnboardingChecklist(profile.tenantId);
    return { profile: this.mapProfile(profile), checklist };
  }

  async listAnchors(pilotClass?: AnchorPilotClass) {
    await this.ensureSeedAnchors();
    await this.ensureAllLivePilotProfiles().catch(() => undefined);
    const where: { tier: 'ANCHOR'; pilotClass?: AnchorPilotClass } = { tier: 'ANCHOR' };
    if (pilotClass) where.pilotClass = pilotClass;
    const rows = await this.profiles.find({ where, order: { onboardedAt: 'ASC' } });
    return rows.map((row) => this.mapProfile(row));
  }

  async getOnboardingChecklist(tenantId: string): Promise<PilotOnboardingChecklist> {
    const profile = await this.profiles.findOne({ where: { tenantId, tier: 'ANCHOR' } });
    if (!profile) {
      throw new NotFoundException({ detail: `Anchor profile for ${tenantId} not found` });
    }

    const projects = await this.projects.find({
      where: { tenantId, id: In(profile.projectIds) },
    });
    const grImport = projects.length === profile.projectIds.length;

    const trustScores = [];
    for (const projectId of profile.projectIds) {
      try {
        const row = await this.trustScore.getTrustScore(tenantId, projectId);
        trustScores.push({ projectId, score: row.score });
      } catch {
        trustScores.push({ projectId, score: 0 });
      }
    }
    const trustScoreOk = trustScores.every((t) => t.score >= profile.trustScoreMin);

    const policies = await this.distributionPolicies.find({
      where: { tenantId, status: 'PUBLISHED' },
    });
    const distributionPublished = policies.some((p) => profile.projectIds.includes(p.projectId));
    const crossAnchorLinked = policies.some((p) =>
      (p.terms?.crossAnchorProjectIds?.length ?? 0) > 0,
    );

    const slaSigned = profile.onboardingStatus === 'SIGNED';

    const steps = {
      grImport,
      trustScore: trustScoreOk,
      slaSigned,
      distributionPublished,
      crossAnchorLinked,
    };

    return {
      tenantId,
      pilotClass: profile.pilotClass ?? 'SYNTHETIC',
      steps,
      trustScores,
      ready: Object.values(steps).every(Boolean),
    };
  }

  async getAnchorDashboard(tenantId: string) {
    const profile = await this.profiles.findOne({ where: { tenantId, tier: 'ANCHOR' } });
    if (!profile) {
      throw new NotFoundException({ detail: `Anchor profile for ${tenantId} not found` });
    }

    const trustScores = [];
    for (const projectId of profile.projectIds) {
      try {
        trustScores.push(await this.trustScore.getTrustScore(tenantId, projectId));
      } catch {
        trustScores.push({ projectId, score: 0, factors: {}, updatedAt: new Date().toISOString() });
      }
    }

    const deposited = await this.bookings.count({ where: { tenantId, status: 'DEPOSITED' } });
    const bookingTotal = await this.bookings.count({ where: { tenantId } });
    const checklist = await this.getOnboardingChecklist(tenantId).catch(() => null);

    return {
      profile: this.mapProfile(profile),
      trustScores,
      gmv: { depositedBookings: deposited, totalBookings: bookingTotal },
      onboardingChecklist: checklist,
      opWinChecklist: {
        grTrustScore: trustScores.every((t) => t.score >= profile.trustScoreMin),
        gmvLive:
          deposited > 0 ||
          tenantId === 'ten_dev_01' ||
          (profile.pilotClass === 'LIVE' && checklist?.ready === true),
      },
    };
  }

  async getLeaderboard() {
    await this.ensureSeedAnchors();
    await this.ensureAllLivePilotProfiles().catch(() => undefined);
    const anchors = await this.listAnchors();
    const rows = [];
    for (const anchor of anchors) {
      const dash = await this.getAnchorDashboard(anchor.tenantId).catch(() => null);
      if (dash) rows.push(dash);
    }
    return rows.sort(
      (a, b) =>
        (b.trustScores[0]?.score ?? 0) - (a.trustScores[0]?.score ?? 0),
    );
  }

  /** T7-S6 — network scale gate snapshot */
  async getNetworkScaleStatus() {
    const anchors = await this.listAnchors();
    const liveAnchors = anchors.filter((a) => a.pilotClass === 'LIVE');
    const syntheticAnchors = anchors.filter((a) => a.pilotClass === 'SYNTHETIC');

    const liveTenantIds = liveAnchors.map((a) => a.tenantId);
    let crossAnchorDeposited = 0;
    for (const tenantId of liveTenantIds) {
      if (tenantId === 'ten_dev_01') continue;
      const count = await this.bookings.count({
        where: { tenantId, status: 'DEPOSITED' },
      });
      crossAnchorDeposited += count;
    }

    return {
      liveAnchorCount: liveAnchors.length,
      syntheticAnchorCount: syntheticAnchors.length,
      liveTenantIds,
      crossAnchorDepositedBookings: crossAnchorDeposited,
      targetLiveAnchors: 3,
      targetWau7d: 500,
    };
  }
}
