import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { Repository } from 'typeorm';
import {
  AuditEventEntity,
  BookingDomainEventEntity,
  BookingEntity,
  CommissionEntryEntity,
  CommissionPolicyEntity,
  CommissionSnapshotEntity,
  KycProfileEntity,
  MetaLeadEventEntity,
  MetaPageBindingEntity,
  ZaloOaBindingEntity,
  SmsBindingEntity,
  DistributionPolicyEntity,
  AgencyApplicationEntity,
  DocumentEntity,
  DocumentAccessLogEntity,
  LeadEntity,
  CrmActivityEntity,
  ListingEntity,
  ListingMediaEntity,
  TrustDisputeEntity,
  AnchorTenantProfileEntity,
  AgentActivityEventEntity,
  ProjectEntity,
  TenantEntity,
  UnitEntity,
  UserEntity,
  TenantConfigVersionEntity,
} from './entities';
import { TenantRlsService } from './tenant-rls.service';
import { ensureMarketplaceSerpSeed } from './marketplace-serp.seed';

const SEED_TENANT_ID = 'ten_dev_01';
const SEED_AGENCY_TENANT_ID = 'ten_agency_01';
const SEED_PROJECT_ID = 'prj_sunrise';
const PILOT_CDT_TENANT_ID = 'ten_pilot_cdt_01';
const PILOT_CDT_PROJECT_ID = 'prj_thanglong_01';

const LIVE_PILOT_SEEDS = [
  {
    tenantId: 'ten_pilot_cdt_01',
    projectId: 'prj_thanglong_01',
    projectCode: 'TL-CENTRAL',
    projectName: 'Thăng Long Central',
    displayName: 'CĐT Thăng Long (Pilot)',
    legalName: 'Công ty CP BĐS Thăng Long',
    unitPrefix: 'tl',
    crossAnchorProjectIds: [SEED_PROJECT_ID],
  },
  {
    tenantId: 'ten_pilot_cdt_02',
    projectId: 'prj_novaland_02',
    projectCode: 'NV-PARK',
    projectName: 'NovaLand Park',
    displayName: 'CĐT NovaLand (Pilot #2)',
    legalName: 'Công ty CP NovaLand Pilot',
    unitPrefix: 'nv',
    crossAnchorProjectIds: [SEED_PROJECT_ID],
  },
  {
    tenantId: 'ten_pilot_cdt_03',
    projectId: 'prj_greencity_03',
    projectCode: 'GC-LAKE',
    projectName: 'GreenCity Lake',
    displayName: 'CĐT GreenCity (Pilot #3)',
    legalName: 'Công ty CP GreenCity Pilot',
    unitPrefix: 'gc',
    crossAnchorProjectIds: ['prj_metro_02'],
  },
] as const;

const DEMO_USERS = [
  {
    id: 'usr_dev_admin',
    email: 'admin@sunrise-dev.vn',
    role: 'DEVELOPER_ADMIN',
    password: 'DevAdmin123!',
  },
  {
    id: 'usr_agent_01',
    email: 'agent@sunrise-dev.vn',
    role: 'AGENT',
    password: 'Agent123!',
  },
  {
    id: 'usr_finance_01',
    email: 'finance@sunrise-dev.vn',
    role: 'FINANCE_ADMIN',
    password: 'Finance123!',
  },
] as const;

const AGENCY_DEMO_USERS = [
  {
    id: 'usr_agency_admin',
    email: 'agency@sunrise-realty.vn',
    role: 'AGENCY_ADMIN',
    password: 'Agency123!',
  },
] as const;

const PILOT_CDT_USERS = [
  {
    id: 'usr_pilot_cdt_admin',
    email: 'pilot@thanglong-dev.vn',
    role: 'DEVELOPER_ADMIN',
    password: 'PilotCdt123!',
  },
  {
    id: 'usr_pilot_agent',
    email: 'agent@thanglong-dev.vn',
    role: 'AGENT',
    password: 'PilotAgent123!',
  },
  {
    id: 'usr_pilot_finance',
    email: 'finance@thanglong-dev.vn',
    role: 'FINANCE_ADMIN',
    password: 'PilotFin123!',
  },
] as const;

/** RFC 6238 test vector — TOTP when tenant mfaSandbox=false (OPS-S2). */
const SEED_MFA_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

@Injectable()
export class DatabaseSeedService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(CrmActivityEntity)
    private readonly activities: Repository<CrmActivityEntity>,
    @InjectRepository(CommissionPolicyEntity)
    private readonly commissionPolicies: Repository<CommissionPolicyEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(CommissionSnapshotEntity)
    private readonly commissionSnapshots: Repository<CommissionSnapshotEntity>,
    @InjectRepository(CommissionEntryEntity)
    private readonly commissionEntries: Repository<CommissionEntryEntity>,
    @InjectRepository(KycProfileEntity)
    private readonly kycProfiles: Repository<KycProfileEntity>,
    @InjectRepository(MetaPageBindingEntity)
    private readonly metaPages: Repository<MetaPageBindingEntity>,
    @InjectRepository(ZaloOaBindingEntity)
    private readonly zaloOas: Repository<ZaloOaBindingEntity>,
    @InjectRepository(SmsBindingEntity)
    private readonly smsBindings: Repository<SmsBindingEntity>,
    @InjectRepository(DistributionPolicyEntity)
    private readonly distributionPolicies: Repository<DistributionPolicyEntity>,
    @InjectRepository(AgencyApplicationEntity)
    private readonly agencyApplications: Repository<AgencyApplicationEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documents: Repository<DocumentEntity>,
    @InjectRepository(DocumentAccessLogEntity)
    private readonly documentAccessLogs: Repository<DocumentAccessLogEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(ListingMediaEntity)
    private readonly listingMedia: Repository<ListingMediaEntity>,
    @InjectRepository(TrustDisputeEntity)
    private readonly trustDisputes: Repository<TrustDisputeEntity>,
    @InjectRepository(AnchorTenantProfileEntity)
    private readonly anchorProfiles: Repository<AnchorTenantProfileEntity>,
    @InjectRepository(AgentActivityEventEntity)
    private readonly agentActivity: Repository<AgentActivityEventEntity>,
    @InjectRepository(TenantConfigVersionEntity)
    private readonly tenantConfigs: Repository<TenantConfigVersionEntity>,
    private readonly tenantRls: TenantRlsService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.tenantRls.runAsPlatformAdmin(async () => {
      await this.runSeeds();
    });
  }

  private async runSeeds() {
    const unitCount = await this.units.count();
    if (unitCount === 0) {
      await this.seed();
      this.logger.log('S1 seed complete — tenant, project, units, demo users');
    } else {
      this.logger.log(`Database already seeded (${unitCount} units)`);
    }
    await this.ensureAuthUsers();
    await this.ensureMfaTotpSecrets();
    await this.ensureAgencyTenant();
    await this.ensureLeads();
    await this.ensureLeadAttribution();
    await this.ensureActivities();
    await this.ensureCommissionPolicy();
    await this.ensureKycProfiles();
    await this.ensureMetaIntegration();
    await this.ensureZaloIntegration();
    await this.ensureSmsIntegration();
    await this.ensureDistributionPolicy();
    await this.ensureAgencyApplication();
    await this.ensureDocumentsDemo();
    await this.ensureCommissionSettlementDemo();
    await this.ensurePublishedListings();
    await this.ensureMarketplaceSerpSeed();
    await this.ensureNnhnMarketplaceBrand();
    await this.ensureDuplicateListingSeed();
    await this.ensureAnomalyListingSeed();
    await this.ensureContractEsignDemo();
    await this.ensureMarketplacePenaltySeed();
    await this.ensureTrustDisputes();
    await this.ensurePilotCdtAnchor();
    await this.ensureLiveRails();
    await this.ensurePilotChannelIntegrations();
    await this.ensurePilotS5Settlement();
    await this.ensureNetworkScaleT7S6();
    await this.ensureEnterpriseT7S8();
  }

  private async ensurePilotCdtAnchor() {
    const existingTenant = await this.tenants.findOne({ where: { id: PILOT_CDT_TENANT_ID } });
    if (!existingTenant) {
      await this.tenants.save({
        id: PILOT_CDT_TENANT_ID,
        name: 'CĐT Thăng Long (Pilot)',
        type: 'DEVELOPER',
        isActive: true,
      });
    }

    const existingProject = await this.projects.findOne({
      where: { id: PILOT_CDT_PROJECT_ID, tenantId: PILOT_CDT_TENANT_ID },
    });
    if (!existingProject) {
      await this.projects.save({
        id: PILOT_CDT_PROJECT_ID,
        tenantId: PILOT_CDT_TENANT_ID,
        code: 'TL-CENTRAL',
        name: 'Thăng Long Central',
      });
    }

    for (const demo of PILOT_CDT_USERS) {
      const user = await this.users.findOne({ where: { email: demo.email } });
      if (user) continue;
      await this.users.save({
        id: demo.id,
        tenantId: PILOT_CDT_TENANT_ID,
        email: demo.email,
        role: demo.role,
        passwordHash: await bcrypt.hash(demo.password, 10),
        isActive: true,
      });
    }

    const unitCount = await this.units.count({ where: { tenantId: PILOT_CDT_TENANT_ID } });
    if (unitCount === 0) {
      await this.units.save([
        {
          id: 'tl_un_01',
          tenantId: PILOT_CDT_TENANT_ID,
          projectId: PILOT_CDT_PROJECT_ID,
          code: 'TL-18-02',
          floor: 18,
          area: '78.00',
          bedrooms: 2,
          basePrice: '4200000000',
          status: 'AVAILABLE',
        },
        {
          id: 'tl_un_02',
          tenantId: PILOT_CDT_TENANT_ID,
          projectId: PILOT_CDT_PROJECT_ID,
          code: 'TL-18-03',
          floor: 18,
          area: '82.50',
          bedrooms: 2,
          basePrice: '4450000000',
          status: 'AVAILABLE',
        },
      ]);
    }

    const auditCount = await this.auditEvents.count({ where: { tenantId: PILOT_CDT_TENANT_ID } });
    if (auditCount === 0) {
      const day = (offset: number) => new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
      await this.auditEvents.save([
        {
          tenantId: PILOT_CDT_TENANT_ID,
          entityType: 'unit',
          entityId: 'tl_un_01',
          action: 'SEED',
          payload: { message: 'Pilot CĐT GR import — UC-GR-01', basePrice: '4100000000' },
          actorId: 'usr_pilot_cdt_admin',
          createdAt: day(30),
        },
        {
          tenantId: PILOT_CDT_TENANT_ID,
          entityType: 'unit',
          entityId: 'tl_un_01',
          action: 'PATCH',
          payload: {
            reason: 'Pilot price adjust',
            before: { basePrice: '4100000000', status: 'AVAILABLE', version: 1 },
            after: { basePrice: '4200000000', status: 'AVAILABLE', version: 2 },
          },
          actorId: 'usr_pilot_cdt_admin',
          createdAt: day(14),
        },
        {
          tenantId: PILOT_CDT_TENANT_ID,
          entityType: 'unit',
          entityId: 'tl_un_02',
          action: 'SEED',
          payload: { message: 'Pilot CĐT GR import — UC-GR-01', basePrice: '4350000000' },
          actorId: 'usr_pilot_cdt_admin',
          createdAt: day(28),
        },
        {
          tenantId: PILOT_CDT_TENANT_ID,
          entityType: 'unit',
          entityId: 'tl_un_02',
          action: 'PATCH',
          payload: {
            reason: 'Pilot price adjust',
            before: { basePrice: '4350000000', status: 'AVAILABLE', version: 1 },
            after: { basePrice: '4450000000', status: 'AVAILABLE', version: 2 },
          },
          actorId: 'usr_pilot_cdt_admin',
          createdAt: day(10),
        },
      ]);
    }

    const existingPolicy = await this.distributionPolicies.findOne({
      where: { id: 'dp_thanglong_mkt_v1' },
    });
    if (!existingPolicy) {
      await this.distributionPolicies.save({
        id: 'dp_thanglong_mkt_v1',
        tenantId: PILOT_CDT_TENANT_ID,
        projectId: PILOT_CDT_PROJECT_ID,
        version: 1,
        status: 'PUBLISHED',
        name: 'Thăng Long Central — co-broker + cross-anchor Sunrise',
        terms: {
          regions: ['HN', 'HCM'],
          commissionTier: 'STANDARD',
          maxAgencies: 8,
          summary: 'Pilot CĐT thật — agency có thể bán chéo prj_sunrise',
          crossAnchorProjectIds: [SEED_PROJECT_ID],
        },
        publishedAt: new Date(),
      });
    }

    const existingProfile = await this.anchorProfiles.findOne({
      where: { tenantId: PILOT_CDT_TENANT_ID },
    });
    if (!existingProfile) {
      await this.anchorProfiles.save({
        id: 'anc_pilot_cdt01',
        tenantId: PILOT_CDT_TENANT_ID,
        tier: 'ANCHOR',
        projectIds: [PILOT_CDT_PROJECT_ID],
        slaPackVersion: '2026-T5-v1',
        trustScoreMin: 80,
        displayName: 'CĐT Thăng Long (Pilot)',
        legalName: 'Công ty CP BĐS Thăng Long',
        pilotClass: 'LIVE',
        onboardingStatus: 'SIGNED',
        onboardedAt: new Date(),
      });
    } else if (existingProfile.pilotClass !== 'LIVE') {
      await this.anchorProfiles.update(
        { id: existingProfile.id },
        {
          pilotClass: 'LIVE',
          onboardingStatus: 'SIGNED',
          legalName: 'Công ty CP BĐS Thăng Long',
          displayName: 'CĐT Thăng Long (Pilot)',
          projectIds: [PILOT_CDT_PROJECT_ID],
        },
      );
    }

    this.logger.log(
      'Pilot CĐT seed — ten_pilot_cdt_01 LIVE anchor parallel synthetic (T5-S7)',
    );
  }

  /** OPS-S1/S2/S4/S5 — tenant LIVE_RAILS overlay. Demo tenant inherits process env (MOCK + MFA sandbox). */
  private async ensureLiveRails() {
    const s4Overlay = {
      znsSandbox: false,
      smsSandbox: false,
      pushLiveEnabled: true,
    };
    const s5Overlay = {
      payoutStub: false,
      payoutEnabled: true,
      esignSandbox: false,
    };
    const s6Overlay = {
      ssoOidcEnabled: false,
      ssoOidcMock: true,
    };
    const desired = {
      paymentMethod: 'VNPAY',
      vnpaySandbox: true,
      mfaSandbox: false,
      simulateEndpoints: false,
      escrowEnabled: false,
      bnplEnabled: false,
      ...s4Overlay,
      ...s5Overlay,
      ...s6Overlay,
    };

    const rows = await this.tenantConfigs.find({
      where: {
        tenantId: PILOT_CDT_TENANT_ID,
        domain: 'LIVE_RAILS',
        entityId: PILOT_CDT_TENANT_ID,
      },
      order: { version: 'DESC' },
      take: 1,
    });
    const existing = rows[0];

    if (existing) {
      const current = existing.payload ?? {};
      const next = {
        ...current,
        mfaSandbox: current.mfaSandbox ?? false,
        ...s4Overlay,
        ...s5Overlay,
        ...s6Overlay,
      };
      const changed = JSON.stringify(next) !== JSON.stringify(current);
      if (changed) {
        existing.payload = next;
        await this.tenantConfigs.save(existing);
        this.logger.log('OPS-S4/S5/S6 LIVE_RAILS — ten_pilot_cdt_01 channels + payout/esign + SSO optional off');
      }
      return;
    }

    await this.tenantConfigs.save({
      id: 'tcv_rails_p01',
      tenantId: PILOT_CDT_TENANT_ID,
      domain: 'LIVE_RAILS',
      entityId: PILOT_CDT_TENANT_ID,
      version: 1,
      payload: desired,
      effectiveAt: new Date(),
      createdBy: 'seed',
    });
    this.logger.log('OPS-S2/S4/S5/S6 LIVE_RAILS — ten_pilot_cdt_01 VNPAY sandbox, MFA live, SSO optional off');
  }

  /** OPS-S4-01/02 — Zalo OA + SMS binding for pilot CĐT tenant. */
  private async ensurePilotChannelIntegrations() {
    const pilot = PILOT_CDT_TENANT_ID;
    const zaloExisting = await this.zaloOas.findOne({
      where: { tenantId: pilot, oaId: 'oa_thanglong_pilot' },
    });
    if (!zaloExisting) {
      await this.zaloOas.save({
        id: 'zob_pilot_tl',
        tenantId: pilot,
        oaId: 'oa_thanglong_pilot',
        oaName: 'Thăng Long Central — Zalo OA',
        isActive: true,
      });
      this.logger.log('OPS-S4 Zalo — oa_thanglong_pilot bound to ten_pilot_cdt_01');
    }

    const smsExisting = await this.smsBindings.findOne({
      where: { tenantId: pilot, id: 'smb_pilot_tl' },
    });
    if (!smsExisting) {
      await this.smsBindings.save({
        id: 'smb_pilot_tl',
        tenantId: pilot,
        provider: 'PILOT_LIVE',
        brandName: 'Thăng Long',
        senderId: 'WEREAL',
        isActive: true,
      });
      this.logger.log('OPS-S4 SMS — smb_pilot_tl bound to ten_pilot_cdt_01');
    }
  }

  /** OPS-S5 — commission settlement + KYC + deposit contract on pilot tenant. */
  private async ensurePilotS5Settlement() {
    const pilot = PILOT_CDT_TENANT_ID;

    const policyExisting = await this.commissionPolicies.findOne({
      where: { id: 'cp_thanglong_v1', tenantId: pilot },
    });
    if (!policyExisting) {
      await this.commissionPolicies.save({
        id: 'cp_thanglong_v1',
        tenantId: pilot,
        projectId: PILOT_CDT_PROJECT_ID,
        version: 1,
        status: 'PUBLISHED',
        name: 'Thăng Long Central — HH đặt cọc',
        ratePercent: '5.000',
        baseType: 'DEPOSIT',
        splitRules: [
          { role: 'PRIMARY', recipientId: 'usr_pilot_agent', percent: 70 },
          { role: 'AGENCY', recipientId: 'agcy_thanglong', percent: 30 },
        ],
        effectiveFrom: null,
        effectiveTo: null,
        publishedAt: new Date(),
      });
    }

    const agentKyc = await this.kycProfiles.findOne({
      where: { tenantId: pilot, subjectType: 'USER', subjectId: 'usr_pilot_agent' },
    });
    if (!agentKyc) {
      await this.kycProfiles.save({
        id: 'kyc_pilot_agent',
        tenantId: pilot,
        subjectType: 'USER',
        subjectId: 'usr_pilot_agent',
        status: 'APPROVED',
        verifiedAt: new Date(),
        notes: 'OPS-S5 pilot agent KYC — BR-23 pass',
      });
    }

    const agencyKyc = await this.kycProfiles.findOne({
      where: { tenantId: pilot, subjectType: 'AGENCY', subjectId: 'agcy_thanglong' },
    });
    if (!agencyKyc) {
      await this.kycProfiles.save({
        id: 'kyc_pilot_agency',
        tenantId: pilot,
        subjectType: 'AGENCY',
        subjectId: 'agcy_thanglong',
        status: 'PENDING',
        verifiedAt: null,
        notes: 'OPS-S5 BR-23 block — ce_pilot_agcy01 payout',
      });
    }

    const leadExisting = await this.leads.findOne({
      where: { id: 'ld_pilot_deposit01', tenantId: pilot },
    });
    if (!leadExisting) {
      await this.leads.save({
        id: 'ld_pilot_deposit01',
        tenantId: pilot,
        fullName: 'Nguyễn Pilot Buyer',
        phone: '+84901112233',
        email: 'pilot.buyer@example.com',
        source: 'WEB',
        score: 80,
        tier: 'WARM',
        status: 'BOOKING',
        routingStatus: 'ASSIGNED',
        scoreStatus: 'SCORED',
        assignedTo: 'usr_pilot_agent',
        unitId: 'tl_un_01',
      });
    }

    const booking = await this.bookings.findOne({
      where: { id: 'bk_pilot_deposit01', tenantId: pilot },
    });
    if (booking && !booking.leadId) {
      booking.leadId = 'ld_pilot_deposit01';
      await this.bookings.save(booking);
    }

    const snapshotExisting = await this.commissionSnapshots.findOne({
      where: { id: 'cs_pilot_settle01', tenantId: pilot },
    });
    if (!snapshotExisting) {
      await this.commissionSnapshots.save({
        id: 'cs_pilot_settle01',
        tenantId: pilot,
        bookingId: 'bk_pilot_deposit01',
        policyId: 'cp_thanglong_v1',
        policyVersion: 1,
        policyHash: 'pilot_hash_settle01',
        dealAmount: '50000000',
        totalCommission: '2500000',
        status: 'CALCULATED',
      });

      await this.commissionEntries.save([
        {
          id: 'ce_pilot_agent01',
          tenantId: pilot,
          snapshotId: 'cs_pilot_settle01',
          recipientType: 'USER',
          recipientId: 'usr_pilot_agent',
          role: 'PRIMARY',
          splitPercent: '70.000',
          amount: '1750000',
          payoutStatus: 'PENDING',
          settlementRunId: null,
        },
        {
          id: 'ce_pilot_agcy01',
          tenantId: pilot,
          snapshotId: 'cs_pilot_settle01',
          recipientType: 'AGENCY',
          recipientId: 'agcy_thanglong',
          role: 'AGENCY',
          splitPercent: '30.000',
          amount: '750000',
          payoutStatus: 'PENDING',
          settlementRunId: null,
        },
      ]);
      this.logger.log('OPS-S5 commission — cs_pilot_settle01 + 2 lines on ten_pilot_cdt_01');
    }

    const contractExisting = await this.auditEvents.findOne({
      where: {
        tenantId: pilot,
        entityType: 'contract',
        entityId: 'ctr_pilot_deposit01',
        action: 'DRAFT',
      },
    });
    if (!contractExisting) {
      const mergedText = `HỢP ĐỒNG ĐẶT CỌC GIỮ CHỖ CĂN HỘ

Dự án: Thăng Long Central
Mã căn (Golden Record): TL-18-02
Giá niêm yết GR: 4.200.000.000 đ VND
Số tiền cọc: 50.000.000 đ VND
Mã booking: bk_pilot_deposit01

BÊN MUA (Bên A): Nguyễn Pilot Buyer · ĐT +84901112233 · Email pilot.buyer@example.com
Đại diện bán hàng: WEREAL Agent Portal
Ngày lập: 20/08/2026

[DRAFT — ký điện tử VNPT tại UC-BK-07 · tenant LIVE esign]`;

      await this.auditEvents.save({
        tenantId: pilot,
        entityType: 'contract',
        entityId: 'ctr_pilot_deposit01',
        action: 'DRAFT',
        payload: {
          templateId: 'tpl_deposit_agreement',
          templateLabel: 'Hợp đồng đặt cọc',
          bookingId: 'bk_pilot_deposit01',
          leadId: 'ld_pilot_deposit01',
          status: 'DRAFT',
          mergedText,
          mergeContext: {
            buyerName: 'Nguyễn Pilot Buyer',
            buyerEmail: 'pilot.buyer@example.com',
            buyerPhone: '+84901112233',
            unitCode: 'TL-18-02',
            projectName: 'Thăng Long Central',
            depositAmount: '50000000',
            bookingId: 'bk_pilot_deposit01',
          },
        },
        actorId: 'usr_pilot_cdt_admin',
      });
      this.logger.log('OPS-S5 contract — ctr_pilot_deposit01 DRAFT on bk_pilot_deposit01');
    }
  }

  /** T7-S6 — 3 LIVE CĐT · cross-anchor DEPOSITED · platform WAU seed */
  private async ensureNetworkScaleT7S6() {
    for (const pilot of LIVE_PILOT_SEEDS.slice(1)) {
      const existingTenant = await this.tenants.findOne({ where: { id: pilot.tenantId } });
      if (!existingTenant) {
        await this.tenants.save({
          id: pilot.tenantId,
          name: pilot.displayName,
          type: 'DEVELOPER',
          isActive: true,
        });
      }

      const existingProject = await this.projects.findOne({
        where: { id: pilot.projectId, tenantId: pilot.tenantId },
      });
      if (!existingProject) {
        await this.projects.save({
          id: pilot.projectId,
          tenantId: pilot.tenantId,
          code: pilot.projectCode,
          name: pilot.projectName,
        });
      }

      const unitId = `${pilot.unitPrefix}_un_01`;
      const existingUnit = await this.units.findOne({ where: { id: unitId } });
      if (!existingUnit) {
        await this.units.save({
          id: unitId,
          tenantId: pilot.tenantId,
          projectId: pilot.projectId,
          code: `${pilot.projectCode}-01`,
          floor: 10,
          area: '75.00',
          bedrooms: 2,
          basePrice: '3900000000',
          status: 'AVAILABLE',
        });
      }

      const profileId = `anc_${pilot.tenantId.replace(/ten_pilot_/, '')}`;
      const existingProfile = await this.anchorProfiles.findOne({
        where: { tenantId: pilot.tenantId },
      });
      if (!existingProfile) {
        await this.anchorProfiles.save({
          id: profileId,
          tenantId: pilot.tenantId,
          tier: 'ANCHOR',
          projectIds: [pilot.projectId],
          slaPackVersion: '2026-T5-v1',
          trustScoreMin: 80,
          displayName: pilot.displayName,
          legalName: pilot.legalName,
          pilotClass: 'LIVE',
          onboardingStatus: 'SIGNED',
          onboardedAt: new Date(),
        });
      } else if (existingProfile.pilotClass !== 'LIVE') {
        await this.anchorProfiles.update(
          { id: existingProfile.id },
          {
            pilotClass: 'LIVE',
            onboardingStatus: 'SIGNED',
            displayName: pilot.displayName,
            legalName: pilot.legalName,
            projectIds: [pilot.projectId],
          },
        );
      }

      const policyId = `dp_${pilot.unitPrefix}_mkt_v1`;
      const existingPolicy = await this.distributionPolicies.findOne({ where: { id: policyId } });
      if (!existingPolicy) {
        await this.distributionPolicies.save({
          id: policyId,
          tenantId: pilot.tenantId,
          projectId: pilot.projectId,
          version: 1,
          status: 'PUBLISHED',
          name: `${pilot.projectName} — cross-anchor`,
          terms: {
            regions: ['HN'],
            commissionTier: 'STANDARD',
            maxAgencies: 5,
            crossAnchorProjectIds: [...pilot.crossAnchorProjectIds],
          },
          publishedAt: new Date(),
        });
      }
    }

    const deposited = await this.bookings.findOne({
      where: { id: 'bk_pilot_deposit01', tenantId: PILOT_CDT_TENANT_ID },
    });
    if (!deposited) {
      await this.bookings.save({
        id: 'bk_pilot_deposit01',
        tenantId: PILOT_CDT_TENANT_ID,
        unitId: 'tl_un_01',
        unitVersion: 2,
        leadId: null,
        status: 'DEPOSITED',
        lockId: 'lock_bk_pilot_deposit01',
        lockToken: 'tok_pilot_deposit01',
        expiresAt: new Date(Date.now() + 86400000),
        depositAmount: '50000000',
        notes: 'T7-S6 cross-anchor GMV on LIVE pilot tenant',
        idempotencyKey: null,
      });
    }

    const activityCount = await this.agentActivity.count({ where: { tenantId: SEED_TENANT_ID } });
    if (activityCount < 500) {
      const batch: Partial<AgentActivityEventEntity>[] = [];
      for (let i = activityCount + 1; i <= 520; i += 1) {
        batch.push({
          id: `aae_net_${String(i).padStart(4, '0')}`,
          tenantId: SEED_TENANT_ID,
          userId: `usr_net_${String(i).padStart(4, '0')}`,
          source: 'MOBILE',
          eventType: 'LEAD_VIEW',
          sessionId: `net_${i}`,
          payload: { networkScale: true, dayOffset: i % 7 },
        });
      }
      for (let offset = 0; offset < batch.length; offset += 100) {
        await this.agentActivity.save(batch.slice(offset, offset + 100) as AgentActivityEventEntity[]);
      }
    }

    this.logger.log('T7-S6 network scale seed — 3 LIVE pilots · DEPOSITED · WAU activity');
  }

  /** T7-S8 — ENTERPRISE white-label pilot domain for tier-1 CĐT */
  private async ensureEnterpriseT7S8() {
    const tenantId = PILOT_CDT_TENANT_ID;
    const existing = await this.auditEvents.findOne({
      where: { tenantId, entityType: 'tenant_brand', action: 'UPDATE' },
    });
    if (existing) return;

    const brand = {
      tenantId,
      displayName: 'Thăng Long Central Portal',
      subdomain: 'thanglong',
      customDomain: 'portal.thanglong-dev.vn',
      primaryColor: '#1A365D',
      accentColor: '#C9A227',
      logoUrl: 'https://cdn.wereal.vn/pilot/thanglong-logo.svg',
      live: true,
      whiteLabelTier: 'ENTERPRISE' as const,
      updatedAt: new Date().toISOString(),
    };

    await this.auditEvents.save({
      tenantId,
      entityType: 'tenant_brand',
      entityId: tenantId,
      action: 'UPDATE',
      payload: { brand, customDomain: brand.customDomain },
      actorId: 'usr_dev_admin',
    });

    this.logger.log('T7-S8 enterprise seed — ENTERPRISE white-label ten_pilot_cdt_01');
  }

  /** P4 — NNHN marketplace white-label on ten_dev_01 */
  private async ensureNnhnMarketplaceBrand() {
    const tenantId = SEED_TENANT_ID;
    const existing = await this.auditEvents.findOne({
      where: { tenantId, entityType: 'tenant_brand', action: 'UPDATE' },
    });
    if (existing) return;

    const brand = {
      tenantId,
      displayName: 'Ngôi Nhà Hôm Nay',
      subdomain: 'nnhn',
      customDomain: 'ngoinhahomnay.vn',
      primaryColor: '#17692F',
      accentColor: '#C7D9C9',
      live: true,
      whiteLabelTier: 'STANDARD' as const,
      updatedAt: new Date().toISOString(),
    };

    await this.auditEvents.save({
      tenantId,
      entityType: 'tenant_brand',
      entityId: tenantId,
      action: 'UPDATE',
      payload: { brand, customDomain: brand.customDomain },
      actorId: 'usr_dev_admin',
    });

    this.logger.log('P4 marketplace seed — NNHN white-label ten_dev_01');
  }

  private async ensurePublishedListings() {
    const existing = await this.listings.count({
      where: { tenantId: SEED_TENANT_ID, status: 'PUBLISHED' },
    });
    if (existing > 0) return;

    await this.listings.save([
      {
        id: 'ls_un01',
        tenantId: SEED_TENANT_ID,
        unitId: 'un_01',
        title: 'Căn hộ 2PN view sông — Sunrise Tower A',
        description:
          'Căn góc tầng 12, thiết kế 2 phòng ngủ rộng, bàn giao full nội thất cao cấp. Golden Record verified.',
        highlights: ['View sông', 'Full nội thất', 'Sổ hồng sẵn'],
        mediaIds: [],
        priceDisplay: '3850000000',
        status: 'PUBLISHED',
        antiDriftStatus: 'PASS',
        driftReport: null,
        verified: true,
        rejectReason: null,
      },
      {
        id: 'ls_un02',
        tenantId: SEED_TENANT_ID,
        unitId: 'un_02',
        title: 'Căn 2PN Sunrise — tầng 12',
        description: 'Diện tích 72.5m², phù hợp gia đình trẻ. Listing sync từ GR.',
        highlights: ['Gần thang máy', 'Ban công rộng'],
        mediaIds: [],
        priceDisplay: '4100000000',
        status: 'PUBLISHED',
        antiDriftStatus: 'PASS',
        driftReport: null,
        verified: true,
        rejectReason: null,
      },
    ]);
    this.logger.log('Listing seed — 2 PUBLISHED listings (UC-LS-05 / SCR-PUBLIC-006)');
  }

  private async ensureMarketplaceSerpSeed() {
    const mediaRoot = this.config.get<string>(
      'LISTING_MEDIA_LOCAL_ROOT',
      join(process.cwd(), 'uploads', 'listing-media'),
    );
    const created = await ensureMarketplaceSerpSeed({
      tenantId: SEED_TENANT_ID,
      sunriseProjectId: SEED_PROJECT_ID,
      mediaRoot,
      projects: this.projects,
      units: this.units,
      listings: this.listings,
      media: this.listingMedia,
    });
    if (created > 0) {
      this.logger.log(`P1 marketplace SERP seed — ${created} listing(s) with cover media`);
    }
  }

  private async ensureDuplicateListingSeed() {
    const dup = await this.listings.findOne({ where: { id: 'ls_un01_dup', tenantId: SEED_TENANT_ID } });
    if (dup) return;

    await this.listings.save({
      id: 'ls_un01_dup',
      tenantId: SEED_TENANT_ID,
      unitId: 'un_01',
      title: 'Căn hộ 2PN view sông — Sunrise Tower A',
      description: 'Bản nháp trùng unit un_01 — demo SCR-ADMIN-009.',
      highlights: ['Duplicate demo'],
      mediaIds: [],
      priceDisplay: '3900000000',
      status: 'PENDING_REVIEW',
      antiDriftStatus: 'PASS',
      driftReport: null,
      verified: false,
      rejectReason: null,
    });
    this.logger.log('Listing seed — duplicate on un_01 (UC-LS-06 / SCR-ADMIN-009)');
  }

  private async ensureAnomalyListingSeed() {
    const existing = await this.listings.findOne({
      where: { id: 'ls_anomaly_demo', tenantId: SEED_TENANT_ID },
    });
    if (existing) return;

    await this.listings.save({
      id: 'ls_anomaly_demo',
      tenantId: SEED_TENANT_ID,
      unitId: 'un_02',
      title: 'Căn 2PN giá bất thường — demo UC-AI-05',
      description: 'Listing giá marketing lệch >10% so với GR — ML flag ops queue.',
      highlights: ['Anomaly demo', 'Price drift'],
      mediaIds: [],
      priceDisplay: '5000000000',
      status: 'PUBLISHED',
      antiDriftStatus: 'BLOCK',
      driftReport: {
        status: 'BLOCK',
        findings: [{ field: 'priceDisplay', severity: 'BLOCK', message: 'Giá lệch GR' }],
      },
      verified: false,
      rejectReason: null,
    });
    this.logger.log('Listing seed — ls_anomaly_demo (UC-AI-05 / SCR-ADMIN-002)');
  }

  private async ensureContractEsignDemo() {
    const existing = await this.auditEvents.findOne({
      where: {
        tenantId: SEED_TENANT_ID,
        entityId: 'ctr_esign_demo01',
        entityType: 'contract',
        action: 'DRAFT',
      },
    });
    if (existing) return;

    const mergedText = `HỢP ĐỒNG ĐẶT CỌC GIỮ CHỖ CĂN HỘ

Dự án: Sunrise Tower A
Mã căn (Golden Record): A-12-05
Giá niêm yết GR: 3.850.000.000 đ VND
Số tiền cọc: 50.000.000 đ VND
Mã booking: bk_contract01

BÊN MUA (Bên A): Thu Trang · ĐT +84901234567 · Email trang@example.com
Đại diện bán hàng: WEREAL Agent Portal
Ngày lập: 29/07/2026

[DRAFT — ký điện tử tại UC-BK-07 · OTP demo 123456]`;

    await this.auditEvents.save({
      tenantId: SEED_TENANT_ID,
      entityType: 'contract',
      entityId: 'ctr_esign_demo01',
      action: 'DRAFT',
      payload: {
        templateId: 'tpl_deposit_agreement',
        templateLabel: 'Hợp đồng đặt cọc',
        bookingId: 'bk_contract01',
        leadId: 'ld_01',
        mergedText,
        mergeContext: {
          buyerName: 'Thu Trang',
          buyerPhone: '+84901234567',
          buyerEmail: 'trang@example.com',
          unitCode: 'A-12-05',
          unitArea: '68.00',
          basePrice: 3850000000,
          depositAmount: 50000000,
          bookingId: 'bk_contract01',
          projectName: 'Sunrise Tower A',
          agentLabel: 'WEREAL Agent Portal',
          contractDate: '29/07/2026',
        },
        notes: 'Demo DRAFT for UC-BK-07 buyer e-sign',
      },
      actorId: 'usr_agent_01',
    });

    await this.bookings.update(
      { id: 'bk_contract01', tenantId: SEED_TENANT_ID },
      { status: 'DEPOSITED' },
    );

    this.logger.log('Contract seed — ctr_esign_demo01 DRAFT (UC-BK-07 / SCR-BUYER-003)');
  }

  private async ensureMarketplacePenaltySeed() {
    const existing = await this.auditEvents.findOne({
      where: {
        tenantId: SEED_TENANT_ID,
        entityType: 'marketplace_penalty',
        entityId: SEED_AGENCY_TENANT_ID,
      },
    });
    if (existing) return;

    await this.auditEvents.save({
      tenantId: SEED_TENANT_ID,
      entityType: 'marketplace_penalty',
      entityId: SEED_AGENCY_TENANT_ID,
      action: 'APPLY',
      payload: {
        points: 15,
        total: 15,
        reason: 'Demo SLA breach — UC-MKT-04 marketplace penalty',
      },
      actorId: 'usr_dev_admin',
    });
    this.logger.log('Marketing seed — agency penalty demo (UC-MKT-04 / SCR-ADMIN-015)');
  }

  private async ensureTrustDisputes() {
    const existing = await this.trustDisputes.count({ where: { tenantId: SEED_TENANT_ID } });
    if (existing > 0) return;

    await this.trustDisputes.save([
      {
        id: 'dsp_demo01',
        tenantId: SEED_TENANT_ID,
        bookingId: 'bk_settle01',
        type: 'PAYMENT',
        status: 'OPEN',
        reason: 'Buyer khiếu nại trừ cọc hai lần — cần replay timeline',
        evidence: [{ kind: 'booking_replay', bookingId: 'bk_settle01' }],
        resolutionNote: null,
        openedBy: 'usr_dev_admin',
        resolvedAt: null,
      },
      {
        id: 'dsp_demo02',
        tenantId: SEED_TENANT_ID,
        bookingId: null,
        type: 'OTHER',
        status: 'IN_MEDIATION',
        reason: 'Agency tranh chấp split hoa hồng — chờ ops',
        evidence: [{ kind: 'commission_snapshot', ref: 'cs_demo01' }],
        resolutionNote: null,
        openedBy: 'usr_dev_admin',
        resolvedAt: null,
      },
    ]);
    this.logger.log('Trust dispute seed — 2 cases (UC-TR-03 / SCR-ADMIN-008)');
  }

  private async ensureAgencyTenant() {
    const existing = await this.tenants.findOne({ where: { id: SEED_AGENCY_TENANT_ID } });
    if (!existing) {
      await this.tenants.save({
        id: SEED_AGENCY_TENANT_ID,
        name: 'Sunrise Realty Agency (Pilot)',
        type: 'AGENCY',
        isActive: true,
      });
      this.logger.log('Agency tenant seed — ten_agency_01 for cross-tenant marketplace (UC-MKT-02)');
    }

    for (const demo of AGENCY_DEMO_USERS) {
      const hash = await bcrypt.hash(demo.password, 10);
      const user = await this.users.findOne({ where: { email: demo.email } });
      if (!user) {
        await this.users.save({
          id: demo.id,
          tenantId: SEED_AGENCY_TENANT_ID,
          email: demo.email,
          role: demo.role,
          passwordHash: hash,
          isActive: true,
        });
        continue;
      }
      if (user.tenantId !== SEED_AGENCY_TENANT_ID || !user.passwordHash) {
        user.tenantId = SEED_AGENCY_TENANT_ID;
        user.passwordHash = hash;
        user.role = demo.role;
        await this.users.save(user);
      }
    }
  }

  private async ensureAuthUsers() {
    for (const demo of DEMO_USERS) {
      const hash = await bcrypt.hash(demo.password, 10);
      const existing = await this.users.findOne({ where: { email: demo.email } });
      if (!existing) {
        await this.users.save({
          id: demo.id,
          tenantId: SEED_TENANT_ID,
          email: demo.email,
          role: demo.role,
          passwordHash: hash,
          isActive: true,
        });
        continue;
      }
      if (!existing.passwordHash) {
        existing.passwordHash = hash;
        await this.users.save(existing);
      }
    }
  }

  /** OPS-S2 — TOTP secret for DEVELOPER_ADMIN + FINANCE_ADMIN (RFC test vector). */
  private async ensureMfaTotpSecrets() {
    const rows = await this.users.find();
    for (const user of rows) {
      if (user.role !== 'DEVELOPER_ADMIN' && user.role !== 'FINANCE_ADMIN') continue;
      if (user.mfaSecret) continue;
      user.mfaSecret = SEED_MFA_TOTP_SECRET;
      await this.users.save(user);
      this.logger.log(`MFA seed — TOTP secret for ${user.email} (mfaSandbox=false tenants)`);
    }
  }

  private async ensureLeads() {
    const count = await this.leads.count({ where: { tenantId: SEED_TENANT_ID } });
    if (count > 0) return;

    await this.leads.save([
      {
        id: 'ld_01',
        tenantId: SEED_TENANT_ID,
        fullName: 'Thu Trang',
        phone: '+84901234567',
        source: 'PUBLIC_FORM',
        score: 92,
        tier: 'HOT',
        scoreStatus: 'SCORED',
        status: 'NEW',
        routingStatus: 'ASSIGNED',
        assignedTo: 'usr_agent_01',
        unitId: 'un_01',
        utmCampaign: 'q7_launch',
        campaignId: 'q7_launch',
        lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: 'ld_02',
        tenantId: SEED_TENANT_ID,
        fullName: 'Nguyễn Văn A',
        phone: '+84987654321',
        source: 'ZALO_OA',
        score: 78,
        tier: 'WARM',
        scoreStatus: 'SCORED',
        status: 'CONTACTED',
        routingStatus: 'ASSIGNED',
        assignedTo: 'usr_agent_01',
        unitId: 'un_02',
        utmCampaign: 'oa_sunrise_dev',
        campaignId: null,
        lastActivityAt: new Date(Date.now() - 55 * 60 * 60 * 1000),
      },
      {
        id: 'ld_sla_soon',
        tenantId: SEED_TENANT_ID,
        fullName: 'Trần Due Soon',
        phone: '+84999888777',
        source: 'PUBLIC_FORM',
        score: 70,
        tier: 'WARM',
        scoreStatus: 'SCORED',
        status: 'NEW',
        routingStatus: 'ASSIGNED',
        assignedTo: 'usr_agent_01',
        unitId: 'un_02',
        lastActivityAt: new Date(Date.now() - 40 * 60 * 60 * 1000),
      },
      {
        id: 'ld_03',
        tenantId: SEED_TENANT_ID,
        fullName: 'Lê Thị B',
        phone: '+84911223344',
        source: 'AGENT_REFERRAL',
        score: 45,
        tier: 'NEW',
        scoreStatus: 'SCORED',
        status: 'VIEWING',
        routingStatus: 'ASSIGNED',
        assignedTo: 'usr_agent_01',
      },
      {
        id: 'ld_04',
        tenantId: SEED_TENANT_ID,
        fullName: 'Phạm C',
        phone: '+84955667788',
        source: 'META_LEAD',
        score: 88,
        tier: 'HOT',
        scoreStatus: 'SCORED',
        status: 'NEGOTIATING',
        routingStatus: 'ASSIGNED',
        assignedTo: 'usr_agent_01',
        unitId: 'un_01',
        utmCampaign: 'camp_sunrise_july',
        campaignId: 'camp_sunrise_july',
        lastActivityAt: new Date(),
      },
    ]);
    this.logger.log('CRM seed — 4 demo leads across pipeline stages');
  }

  /** Backfill UC-AN-04 columns on existing demo leads */
  private async ensureLeadAttribution() {
    const patches = [
      { id: 'ld_01', utmCampaign: 'q7_launch', campaignId: 'q7_launch' },
      { id: 'ld_02', utmCampaign: 'oa_sunrise_dev', campaignId: null as string | null },
      { id: 'ld_04', utmCampaign: 'camp_sunrise_july', campaignId: 'camp_sunrise_july' },
    ];

    let updated = 0;
    for (const patch of patches) {
      const row = await this.leads.findOne({ where: { id: patch.id, tenantId: SEED_TENANT_ID } });
      if (!row || row.utmCampaign || row.campaignId) continue;
      row.utmCampaign = patch.utmCampaign;
      row.campaignId = patch.campaignId;
      await this.leads.save(row);
      updated += 1;
    }
    if (updated > 0) {
      this.logger.log(`Attribution seed — backfilled ${updated} leads (UC-AN-04)`);
    }
  }

  private async ensureActivities() {
    const count = await this.activities.count({ where: { tenantId: SEED_TENANT_ID } });
    if (count > 0) return;

    const now = Date.now();
    await this.activities.save([
      {
        id: 'act_01',
        tenantId: SEED_TENANT_ID,
        leadId: 'ld_01',
        type: 'CALL',
        summary: 'Gọi tư vấn lần 1 — quan tâm 2PN',
        createdBy: 'usr_agent_01',
        createdAt: new Date(now - 2 * 60 * 60 * 1000),
      },
      {
        id: 'act_02',
        tenantId: SEED_TENANT_ID,
        leadId: 'ld_02',
        type: 'ZALO',
        summary: 'Nhắn Zalo gửi brochure dự án',
        createdBy: 'usr_agent_01',
        createdAt: new Date(now - 26 * 60 * 60 * 1000),
      },
      {
        id: 'act_03',
        tenantId: SEED_TENANT_ID,
        leadId: 'ld_04',
        type: 'VISIT',
        summary: 'Xem căn mẫu un_01 — hài lòng view sông',
        createdBy: 'usr_agent_01',
        createdAt: new Date(now - 60 * 60 * 1000),
      },
    ]);
    this.logger.log('CRM seed — 3 demo activities');
  }

  private async ensureCommissionPolicy() {
    const existing = await this.commissionPolicies.findOne({
      where: { tenantId: SEED_TENANT_ID, projectId: SEED_PROJECT_ID, status: 'PUBLISHED' },
    });
    if (existing) return;

    await this.commissionPolicies.save({
      id: 'cp_sunrise_v1',
      tenantId: SEED_TENANT_ID,
      projectId: SEED_PROJECT_ID,
      version: 1,
      status: 'PUBLISHED',
      name: 'Sunrise Tower A — default 2.5%',
      ratePercent: '2.500',
      baseType: 'DEPOSIT',
      splitRules: [
        { role: 'PRIMARY', recipientId: 'usr_agent_01', percent: 70 },
        { role: 'AGENCY', recipientId: 'agcy_sunrise', percent: 30 },
      ],
      effectiveFrom: null,
      effectiveTo: null,
      publishedAt: new Date(),
    });
    this.logger.log('Commission seed — published policy cp_sunrise_v1 for prj_sunrise');
  }

  private async ensureKycProfiles() {
    const existing = await this.kycProfiles.count({ where: { tenantId: SEED_TENANT_ID } });
    if (existing > 0) {
      await this.ensureAgencyKyc();
      await this.ensureDevAgencyKycBlock();
      return;
    }

    await this.kycProfiles.save([
      {
        id: 'kyc_agent01',
        tenantId: SEED_TENANT_ID,
        subjectType: 'USER',
        subjectId: 'usr_agent_01',
        status: 'APPROVED',
        verifiedAt: new Date(),
        notes: 'Pilot agent KYC — BR-23 pass',
      },
    ]);
    this.logger.log('KYC seed — agent APPROVED on ten_dev_01 (BR-23 demo)');
    await this.ensureAgencyKyc();
    await this.ensureDevAgencyKycBlock();
  }

  /** BR-23 — agency line on ten_dev_01 blocked until finance approves KYB */
  private async ensureDevAgencyKycBlock() {
    const existing = await this.kycProfiles.findOne({
      where: { tenantId: SEED_TENANT_ID, subjectType: 'AGENCY', subjectId: 'agcy_sunrise' },
    });
    if (existing) return;

    await this.kycProfiles.save({
      id: 'kyc_agency_dev01',
      tenantId: SEED_TENANT_ID,
      subjectType: 'AGENCY',
      subjectId: 'agcy_sunrise',
      status: 'PENDING',
      verifiedAt: null,
      notes: 'Chờ duyệt KYB — chặn payout ce_settle02 trên ten_dev_01 (P3-S5 OP-WIN-06)',
    });
    this.logger.log('KYC seed — agcy_sunrise PENDING on ten_dev_01 (ce_settle02 block)');
  }

  private async ensureAgencyKyc() {
    const existing = await this.kycProfiles.findOne({
      where: { tenantId: SEED_AGENCY_TENANT_ID, subjectId: 'agcy_sunrise' },
    });
    if (existing) return;

    await this.kycProfiles.save({
      id: 'kyc_agency01',
      tenantId: SEED_AGENCY_TENANT_ID,
      subjectType: 'AGENCY',
      subjectId: 'agcy_sunrise',
      status: 'PENDING',
      verifiedAt: null,
      notes: 'Chờ duyệt KYB trên ten_agency_01 — chặn payout ce_settle02',
    });
    this.logger.log('KYC seed — agcy_sunrise PENDING on ten_agency_01');
  }

  private async ensureMetaIntegration() {
    const existing = await this.metaPages.findOne({
      where: { tenantId: SEED_TENANT_ID, pageId: 'page_sunrise_dev' },
    });
    if (existing) return;

    await this.metaPages.save({
      id: 'mpb_sunrise',
      tenantId: SEED_TENANT_ID,
      pageId: 'page_sunrise_dev',
      pageName: 'Sunrise Tower — Meta Lead Ads',
      isActive: true,
    });
    this.logger.log('Meta seed — page_sunrise_dev bound for UC-NW-02 / TC-21');
  }

  private async ensureZaloIntegration() {
    const existing = await this.zaloOas.findOne({
      where: { tenantId: SEED_TENANT_ID, oaId: 'oa_sunrise_dev' },
    });
    if (existing) return;

    await this.zaloOas.save({
      id: 'zob_sunrise',
      tenantId: SEED_TENANT_ID,
      oaId: 'oa_sunrise_dev',
      oaName: 'Sunrise Tower — Zalo OA',
      isActive: true,
    });
    this.logger.log('Zalo seed — oa_sunrise_dev bound for UC-NW-01 / AC-US-NW-01');
  }

  private async ensureSmsIntegration() {
    const existing = await this.smsBindings.findOne({
      where: { tenantId: SEED_TENANT_ID, id: 'smb_sunrise' },
    });
    if (existing) return;

    await this.smsBindings.save({
      id: 'smb_sunrise',
      tenantId: SEED_TENANT_ID,
      provider: 'SANDBOX',
      brandName: 'Sunrise Tower',
      senderId: 'WEREAL',
      isActive: true,
    });
    this.logger.log('SMS seed — smb_sunrise bound for UC-NW-03 / SCR-ADMIN-012');
  }

  private async ensureDistributionPolicy() {
    const existing = await this.distributionPolicies.findOne({
      where: { id: 'dp_sunrise_mkt_v1' },
    });
    if (existing) return;

    await this.distributionPolicies.save({
      id: 'dp_sunrise_mkt_v1',
      tenantId: SEED_TENANT_ID,
      projectId: SEED_PROJECT_ID,
      version: 1,
      status: 'PUBLISHED',
      name: 'Sunrise Tower A — co-broker marketplace',
      terms: {
        regions: ['HCM', 'BD'],
        commissionTier: 'STANDARD',
        maxAgencies: 10,
        summary: 'Agency đạt KPI lead/booking — split 70/30 theo cp_sunrise_v1',
      },
      publishedAt: new Date(),
    });
    this.logger.log('Marketing seed — published dp_sunrise_mkt_v1 for UC-MKT-01');
  }

  private async ensureAgencyApplication() {
    const existing = await this.agencyApplications.findOne({ where: { id: 'aa_pilot01' } });
    if (existing) return;

    await this.agencyApplications.save({
      id: 'aa_pilot01',
      developerTenantId: SEED_TENANT_ID,
      agencyTenantId: SEED_AGENCY_TENANT_ID,
      projectId: SEED_PROJECT_ID,
      distributionPolicyId: 'dp_sunrise_mkt_v1',
      status: 'PENDING',
      message: 'Sunrise Realty xin quyền phân phối căn 2PN — pilot cross-tenant',
      reviewNotes: null,
      reviewedBy: null,
      reviewedAt: null,
    });
    this.logger.log('Marketing seed — aa_pilot01 PENDING (ten_agency_01 → ten_dev_01)');
  }

  private async ensureDocumentsDemo() {
    const existing = await this.documents.findOne({ where: { id: 'doc_seed_legal01' } });
    if (existing) return;

    const fileName = 'sunrise-legal-pack.txt';
    const content = Buffer.from(
      'Sunrise Tower A — Legal pack pilot\nUC-TR-02 Document Vault · BR-08 access log\n',
    );
    const contentHash = createHash('sha256').update(content).digest('hex');
    const storageKey = `project/${SEED_PROJECT_ID}/doc_seed_legal01_${fileName}`;
    const localRoot = process.env.DOCUMENTS_LOCAL_ROOT ?? join(process.cwd(), 'uploads');
    const absolutePath = join(localRoot, SEED_TENANT_ID, storageKey);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content);

    await this.documents.save({
      id: 'doc_seed_legal01',
      tenantId: SEED_TENANT_ID,
      entityType: 'PROJECT',
      entityId: SEED_PROJECT_ID,
      folder: 'LEGAL',
      docType: 'LEGAL_PACK',
      fileName,
      mimeType: 'text/plain',
      sizeBytes: content.length,
      contentHash,
      storageKey,
      storageProvider: 'LOCAL',
      watermarkEnabled: true,
      scanStatus: 'CLEAN',
      retentionClass: '5Y',
      version: 1,
      createdBy: 'usr_dev_admin',
    });

    await this.documentAccessLogs.save({
      id: 'dal_seed_upload01',
      tenantId: SEED_TENANT_ID,
      documentId: 'doc_seed_legal01',
      action: 'UPLOAD',
      actorId: 'usr_dev_admin',
      metadata: { seed: true, storageMode: 'local' },
    });

    this.logger.log('Documents seed — doc_seed_legal01 on disk + vault (UC-TR-02)');
  }

  private async ensureCommissionSettlementDemo() {
    const existing = await this.commissionSnapshots.findOne({
      where: { tenantId: SEED_TENANT_ID, id: 'cs_settle01' },
    });
    if (existing) return;

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.bookings.save({
      id: 'bk_settle01',
      tenantId: SEED_TENANT_ID,
      unitId: 'un_03',
      unitVersion: 1,
      leadId: 'ld_04',
      status: 'DEPOSITED',
      lockId: 'lock_bk_settle01',
      lockToken: 'tok_settle01',
      expiresAt,
      depositAmount: '100000000',
      notes: 'Demo booking for settlement E2E (G2.1)',
      idempotencyKey: null,
    });

    await this.bookings.save({
      id: 'bk_contract01',
      tenantId: SEED_TENANT_ID,
      unitId: 'un_01',
      unitVersion: 1,
      leadId: 'ld_01',
      status: 'RESERVED',
      lockId: 'lock_bk_contract01',
      lockToken: 'tok_contract01',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      depositAmount: '50000000',
      notes: 'Demo booking for UC-BK-06 contract wizard',
      idempotencyKey: null,
    });

    await this.commissionSnapshots.save({
      id: 'cs_settle01',
      tenantId: SEED_TENANT_ID,
      bookingId: 'bk_settle01',
      policyId: 'cp_sunrise_v1',
      policyVersion: 1,
      policyHash: 'demo_hash_settle01',
      dealAmount: '100000000',
      totalCommission: '2500000',
      status: 'CALCULATED',
    });

    await this.commissionEntries.save([
      {
        id: 'ce_settle01',
        tenantId: SEED_TENANT_ID,
        snapshotId: 'cs_settle01',
        recipientType: 'AGENT',
        recipientId: 'usr_agent_01',
        role: 'PRIMARY',
        splitPercent: '70.000',
        amount: '1750000',
        payoutStatus: 'PENDING',
        settlementRunId: null,
      },
      {
        id: 'ce_settle02',
        tenantId: SEED_TENANT_ID,
        snapshotId: 'cs_settle01',
        recipientType: 'AGENCY',
        recipientId: 'agcy_sunrise',
        role: 'AGENCY',
        splitPercent: '30.000',
        amount: '750000',
        payoutStatus: 'PENDING',
        settlementRunId: null,
      },
    ]);
    this.logger.log('Commission seed — snapshot cs_settle01 + 2 payable lines for SCR-FIN-006');
  }

  private async seed() {
    await this.tenants.save({
      id: SEED_TENANT_ID,
      name: 'Sunrise Development (Pilot)',
      type: 'DEVELOPER',
      isActive: true,
    });

    await this.projects.save({
      id: SEED_PROJECT_ID,
      tenantId: SEED_TENANT_ID,
      code: 'SUNRISE-A',
      name: 'Sunrise Tower A',
    });

    for (const demo of DEMO_USERS) {
      await this.users.save({
        id: demo.id,
        tenantId: SEED_TENANT_ID,
        email: demo.email,
        role: demo.role,
        passwordHash: await bcrypt.hash(demo.password, 10),
        isActive: true,
      });
    }

    const unitRows: Partial<UnitEntity>[] = [
      {
        id: 'un_01',
        tenantId: SEED_TENANT_ID,
        projectId: SEED_PROJECT_ID,
        code: 'A-12-05',
        floor: 12,
        area: '68.00',
        bedrooms: 2,
        basePrice: '3850000000',
        status: 'AVAILABLE',
      },
      {
        id: 'un_02',
        tenantId: SEED_TENANT_ID,
        projectId: SEED_PROJECT_ID,
        code: 'A-12-06',
        floor: 12,
        area: '72.50',
        bedrooms: 2,
        basePrice: '4100000000',
        status: 'AVAILABLE',
      },
      {
        id: 'un_03',
        tenantId: SEED_TENANT_ID,
        projectId: SEED_PROJECT_ID,
        code: 'A-15-01',
        floor: 15,
        area: '95.00',
        bedrooms: 3,
        basePrice: '5200000000',
        status: 'RESERVED',
      },
      {
        id: 'un_04',
        tenantId: SEED_TENANT_ID,
        projectId: SEED_PROJECT_ID,
        code: 'B-08-02',
        floor: 8,
        area: '55.00',
        bedrooms: 1,
        basePrice: '2900000000',
        status: 'SOLD',
      },
    ];

    await this.units.save(unitRows);

    await this.units.update({ id: 'un_01', tenantId: SEED_TENANT_ID }, { version: 3 });

    const day = (offset: number) => new Date(Date.now() - offset * 24 * 60 * 60 * 1000);

    await this.auditEvents.save([
      {
        tenantId: SEED_TENANT_ID,
        entityType: 'unit',
        entityId: 'un_01',
        action: 'SEED',
        payload: { message: 'S1 demo seed — UC-GR-01', basePrice: '3600000000', status: 'AVAILABLE', version: 1 },
        actorId: 'usr_dev_admin',
        createdAt: day(45),
      },
      {
        tenantId: SEED_TENANT_ID,
        entityType: 'unit',
        entityId: 'un_01',
        action: 'PATCH',
        payload: {
          reason: 'Phase 1 price adjust',
          before: { basePrice: '3600000000', status: 'AVAILABLE', version: 1 },
          after: { basePrice: '3750000000', status: 'AVAILABLE', version: 2 },
        },
        actorId: 'usr_dev_admin',
        createdAt: day(21),
      },
      {
        tenantId: SEED_TENANT_ID,
        entityType: 'unit',
        entityId: 'un_01',
        action: 'PATCH',
        payload: {
          reason: 'Market index +2.6%',
          before: { basePrice: '3750000000', status: 'AVAILABLE', version: 2 },
          after: { basePrice: '3850000000', status: 'AVAILABLE', version: 3 },
        },
        actorId: 'usr_dev_admin',
        createdAt: day(7),
      },
    ]);
  }
}

export {
  SEED_TENANT_ID,
  SEED_AGENCY_TENANT_ID,
  SEED_PROJECT_ID,
  DEMO_USERS,
  AGENCY_DEMO_USERS,
};
