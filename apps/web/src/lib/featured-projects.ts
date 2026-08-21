import type { ProjectDetailResponse } from './api';

export const FEATURED_PROJECT_IDS = ['prj_mkp_hcm', 'prj_sunrise', 'prj_mkp_dn'] as const;

export type FeaturedIntro = {
  developer: string;
  tagline: string;
  art: 'river' | 'tower' | 'bay';
};

export const PROJECT_INTROS: Record<string, FeaturedIntro> = {
  prj_mkp_hcm: {
    developer: 'Pearl Land',
    tagline: 'Căn hộ ven sông Sài Gòn — bảng hàng Verified, giá Golden Record.',
    art: 'river',
  },
  prj_sunrise: {
    developer: 'Sunrise Development',
    tagline: 'Tòa căn hộ Cầu Giấy — giữ chỗ 30 giây, so sánh căn trên cùng mặt tiền.',
    art: 'tower',
  },
  prj_mkp_dn: {
    developer: 'Bay Group',
    tagline: 'View vịnh Đà Nẵng — listing đã duyệt, liên hệ CĐT ngay trên trang dự án.',
    art: 'bay',
  },
};

export type HeroSlide = {
  id: string;
  name: string;
  code: string;
  city: string;
  district: string;
  unitCount: number;
  verifiedCount: number;
  minPrice: number;
  maxPrice: number;
  thumbnailUrl: string | null;
  developer: string;
  tagline: string;
  art: FeaturedIntro['art'];
};

export function slideFromProject(res: ProjectDetailResponse): HeroSlide {
  const a = res.data.attributes;
  const intro = PROJECT_INTROS[res.data.id];
  const cover =
    res.data.listings.find((h) => h.attributes.thumbnailUrl)?.attributes.thumbnailUrl ?? null;
  return {
    id: res.data.id,
    name: a.name,
    code: a.code,
    city: a.city ?? '',
    district: a.district ?? '',
    unitCount: a.unitCount,
    verifiedCount: a.verifiedCount,
    minPrice: a.minPrice,
    maxPrice: a.maxPrice,
    thumbnailUrl: cover,
    developer: intro?.developer ?? 'Chủ đầu tư',
    tagline: intro?.tagline ?? `${a.unitCount} căn trên bảng hàng — xem chi tiết dự án.`,
    art: intro?.art ?? 'tower',
  };
}
