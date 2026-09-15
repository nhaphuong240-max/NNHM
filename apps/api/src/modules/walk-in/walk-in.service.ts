import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BusinessErrorCode, throwBusinessError } from '../../common/business-error';
import { WalkInCheckinEntity } from '../../database/entities/walk-in-checkin.entity';
import { WalkInGalleryEntity } from '../../database/entities/walk-in-gallery.entity';
import { AuditService } from '../audit/audit.service';
import { CrmService } from '../crm/crm.service';
import { normalizePhone, phonesMatch } from '../crm/phone.util';

/** FR-DP-005 — QR walk-in gallery check-in → Lead Registry. */
@Injectable()
export class WalkInService {
  constructor(
    @InjectRepository(WalkInGalleryEntity)
    private readonly galleries: Repository<WalkInGalleryEntity>,
    @InjectRepository(WalkInCheckinEntity)
    private readonly checkins: Repository<WalkInCheckinEntity>,
    private readonly crm: CrmService,
    private readonly audit: AuditService,
  ) {}

  status() {
    return {
      module: 'walk-in',
      fr: 'FR-DP-005',
      screen: 'SCR-PUBLIC-004',
      uc: 'UC-LEAD-01',
    };
  }

  async listGalleries(tenantId: string) {
    const rows = await this.galleries.find({
      where: { tenantId, status: 'OPEN' },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    const webBase = process.env.WEB_BASE_URL ?? 'https://ngoinhahomnay.vn';
    return {
      data: rows.map((g) => ({
        id: g.id,
        projectId: g.projectId,
        title: g.title,
        token: g.token,
        publicUrl: `${webBase}/public/walk-in/${g.token}`,
        status: g.status,
      })),
      meta: { tenantId, count: rows.length, fr: 'FR-DP-005' },
    };
  }

  async getGalleryByToken(tenantId: string, token: string) {
    const gallery = await this.galleries.findOne({
      where: { tenantId, token: token.trim(), status: 'OPEN' },
    });
    if (!gallery) {
      throwBusinessError(BusinessErrorCode.NOT_FOUND, 'Walk-in gallery not found');
    }
    return {
      data: {
        id: gallery!.id,
        projectId: gallery!.projectId,
        title: gallery!.title,
        token: gallery!.token,
      },
      meta: { tenantId, fr: 'FR-DP-005', screen: 'SCR-PUBLIC-004' },
    };
  }

  async checkIn(
    tenantId: string,
    token: string,
    input: { fullName: string; phone: string; consent?: { privacyAccepted?: boolean; privacyPolicyVersion?: string } },
    actorId?: string,
  ) {
    const gallery = await this.galleries.findOne({
      where: { tenantId, token: token.trim(), status: 'OPEN' },
    });
    if (!gallery) {
      throwBusinessError(BusinessErrorCode.NOT_FOUND, 'Walk-in gallery not found');
    }

    const phone = input.phone.trim();
    const fullName = input.fullName.trim();
    if (!fullName || !phone) {
      throwBusinessError(BusinessErrorCode.VALIDATION_FAILED, 'fullName and phone are required');
    }

    const recent = await this.checkins.find({
      where: { tenantId, galleryId: gallery.id },
      order: { checkedInAt: 'DESC' },
      take: 50,
    });
    const replay = recent.find((c) => phonesMatch(c.phone, phone));
    if (replay) {
      return {
        data: {
          checkInId: replay.id,
          leadId: replay.leadId,
          galleryTitle: gallery.title,
          checkedInAt: replay.checkedInAt.toISOString(),
          replay: true,
        },
        meta: { tenantId, fr: 'FR-DP-005', uc: 'UC-LEAD-01' },
      };
    }

    const lead = await this.crm.createLead(
      tenantId,
      {
        fullName,
        phone,
        source: 'WALK_IN_GALLERY',
        projectId: gallery.projectId,
        message: `Walk-in gallery ${gallery.title}`,
        consent: input.consent,
      },
      undefined,
      actorId,
    );

    const checkInId = `wic_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const row = await this.checkins.save({
      id: checkInId,
      tenantId,
      galleryId: gallery.id,
      leadId: lead.data.id,
      fullName,
      phone: normalizePhone(phone),
      checkedInBy: actorId ?? null,
    });

    await this.audit.append({
      tenantId,
      entityType: 'walk_in_checkin',
      entityId: checkInId,
      action: 'CHECK_IN',
      payload: { galleryId: gallery.id, leadId: lead.data.id, actorId: actorId ?? 'self' },
      actorId: actorId ?? null,
    });

    return {
      data: {
        checkInId: row.id,
        leadId: lead.data.id,
        galleryTitle: gallery.title,
        checkedInAt: row.checkedInAt.toISOString(),
        replay: false,
      },
      meta: { tenantId, fr: 'FR-DP-005', uc: 'UC-LEAD-01' },
    };
  }

  async listCheckIns(tenantId: string, galleryId: string) {
    const gallery = await this.galleries.findOne({ where: { id: galleryId, tenantId } });
    if (!gallery) {
      throwBusinessError(BusinessErrorCode.NOT_FOUND, 'Walk-in gallery not found');
    }
    const rows = await this.checkins.find({
      where: { tenantId, galleryId },
      order: { checkedInAt: 'DESC' },
      take: 30,
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        phone: r.phone,
        leadId: r.leadId,
        checkedInAt: r.checkedInAt.toISOString(),
        checkedInBy: r.checkedInBy,
      })),
      meta: { tenantId, galleryId, count: rows.length, fr: 'FR-DP-005' },
    };
  }
}
