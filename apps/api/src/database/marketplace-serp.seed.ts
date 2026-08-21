import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { Repository } from 'typeorm';
import { ListingEntity } from './entities/listing.entity';
import { ListingMediaEntity } from './entities/listing-media.entity';
import { ProjectEntity } from './entities/project.entity';
import { UnitEntity } from './entities/unit.entity';

export const MARKETPLACE_SERP_TARGET = 22;

/** 1×1 JPEG — valid placeholder for listing cover seeds. */
const PLACEHOLDER_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
  'base64',
);

const MKP_PROJECTS = [
  {
    id: 'prj_mkp_hcm',
    code: 'SG-PEARL',
    name: 'Saigon Pearl Residences',
    city: 'TP.HCM',
    district: 'Quận 2',
  },
  {
    id: 'prj_mkp_dn',
    code: 'DN-BAY',
    name: 'Danang Bay View',
    city: 'Đà Nẵng',
    district: 'Hải Châu',
  },
] as const;

const HN_DISTRICTS = ['Cầu Giấy', 'Ba Đình', 'Nam Từ Liêm'] as const;

type SeedDeps = {
  tenantId: string;
  sunriseProjectId: string;
  mediaRoot: string;
  projects: Repository<ProjectEntity>;
  units: Repository<UnitEntity>;
  listings: Repository<ListingEntity>;
  media: Repository<ListingMediaEntity>;
};

function listingMediaPath(root: string, tenantId: string, storageKey: string) {
  return join(root, tenantId, storageKey);
}

function writePlaceholderMedia(root: string, tenantId: string, storageKey: string) {
  const abs = listingMediaPath(root, tenantId, storageKey);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, PLACEHOLDER_JPEG);
}

export async function ensureMarketplaceSerpSeed(deps: SeedDeps): Promise<number> {
  const indexable = await deps.listings.count({
    where: { tenantId: deps.tenantId, status: 'PUBLISHED', antiDriftStatus: 'PASS' },
  });
  if (indexable >= MARKETPLACE_SERP_TARGET) return 0;

  await deps.projects.update(
    { id: deps.sunriseProjectId, tenantId: deps.tenantId },
    { city: 'Hà Nội', district: 'Cầu Giấy' },
  );

  for (const p of MKP_PROJECTS) {
    const existing = await deps.projects.findOne({ where: { id: p.id, tenantId: deps.tenantId } });
    if (!existing) {
      await deps.projects.save({
        id: p.id,
        tenantId: deps.tenantId,
        code: p.code,
        name: p.name,
        city: p.city,
        district: p.district,
      });
    } else if (!existing.city) {
      await deps.projects.update({ id: p.id }, { city: p.city, district: p.district });
    }
  }

  const templates = [
    { bedrooms: 1, area: '52.00', priceBase: 2_650_000_000 },
    { bedrooms: 2, area: '68.00', priceBase: 3_450_000_000 },
    { bedrooms: 2, area: '72.50', priceBase: 3_950_000_000 },
    { bedrooms: 3, area: '95.00', priceBase: 5_200_000_000 },
    { bedrooms: 3, area: '105.00', priceBase: 6_800_000_000 },
  ];

  let created = 0;
  for (let i = 1; i <= 24; i += 1) {
    const unitId = `mkp_un_${String(i).padStart(2, '0')}`;
    const listingId = `mkp_ls_${String(i).padStart(2, '0')}`;
    const mediaId = `mkp_md_${String(i).padStart(2, '0')}`;

    if (await deps.listings.findOne({ where: { id: listingId, tenantId: deps.tenantId } })) {
      continue;
    }

    const tpl = templates[i % templates.length];
    const hnDistrict = HN_DISTRICTS[i % HN_DISTRICTS.length];
    const project =
      i % 3 === 0
        ? MKP_PROJECTS[0]
        : i % 3 === 1
          ? { ...MKP_PROJECTS[1] }
          : {
              id: deps.sunriseProjectId,
              code: 'SUNRISE-A',
              name: 'Sunrise Tower A',
              city: 'Hà Nội',
              district: hnDistrict,
            };

    const priceOffset = (i % 5) * 120_000_000;
    const basePrice = String(tpl.priceBase + priceOffset);

    await deps.units.save({
      id: unitId,
      tenantId: deps.tenantId,
      projectId: project.id,
      code: `MKP-${String(i).padStart(3, '0')}`,
      floor: 5 + (i % 20),
      area: tpl.area,
      bedrooms: tpl.bedrooms,
      basePrice,
      status: 'AVAILABLE',
    });

    await deps.listings.save({
      id: listingId,
      tenantId: deps.tenantId,
      unitId,
      title: `${tpl.bedrooms}PN ${project.name} — tầng ${5 + (i % 20)}`,
      description: `Căn ${tpl.bedrooms} phòng ngủ tại ${project.district}, ${project.city}. Golden Record verified, có ảnh thật.`,
      highlights: ['View đẹp', 'Gần tiện ích', project.district],
      mediaIds: [],
      priceDisplay: basePrice,
      status: 'PUBLISHED',
      antiDriftStatus: 'PASS',
      driftReport: null,
      verified: i % 4 !== 0,
      rejectReason: null,
    });

    const storageKey = `${listingId}/${mediaId}.jpg`;
    writePlaceholderMedia(deps.mediaRoot, deps.tenantId, storageKey);

    await deps.media.save({
      id: mediaId,
      tenantId: deps.tenantId,
      listingId,
      fileName: `cover-${i}.jpg`,
      mimeType: 'image/jpeg',
      storageKey,
      sizeBytes: String(PLACEHOLDER_JPEG.length),
      sortOrder: 0,
      isCover: true,
      scanStatus: 'CLEAN',
    });

    await deps.listings.update({ id: listingId, tenantId: deps.tenantId }, { mediaIds: [mediaId] });

    created += 1;
  }

  return created;
}
