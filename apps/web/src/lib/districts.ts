/** SEO district landing config — shared by SERP filters, footer, /mua/:slug */
export type DistrictConfig = {
  slug: string;
  label: string;
  city: string;
  seoTitle: string;
  seoDescription: string;
};

export const DISTRICTS: DistrictConfig[] = [
  {
    slug: 'cau-giay',
    label: 'Cầu Giấy',
    city: 'Hà Nội',
    seoTitle: 'Căn hộ bán tại Cầu Giấy, Hà Nội',
    seoDescription:
      'Xem căn hộ chính chủ và dự án mới tại Cầu Giấy, Hà Nội. Giá Golden Record, Verified listing, liên hệ tư vấn miễn phí.',
  },
  {
    slug: 'ba-dinh',
    label: 'Ba Đình',
    city: 'Hà Nội',
    seoTitle: 'Căn hộ bán tại Ba Đình, Hà Nội',
    seoDescription:
      'Danh sách căn hộ bán tại Ba Đình — khoảng giá minh bạch, so sánh căn, giữ chỗ trực tuyến trên Ngôi Nhà Hôm Nay.',
  },
  {
    slug: 'quan-2',
    label: 'Quận 2',
    city: 'TP.HCM',
    seoTitle: 'Căn hộ bán tại Quận 2, TP.HCM',
    seoDescription:
      'Tìm căn hộ và dự án tại Quận 2 (TP. Thủ Đức). Listing Verified, ảnh thật, CTA liên hệ ngay trên bảng hàng.',
  },
  {
    slug: 'quan-7',
    label: 'Quận 7',
    city: 'TP.HCM',
    seoTitle: 'Căn hộ bán tại Quận 7, TP.HCM',
    seoDescription:
      'Khám phá căn hộ bán tại Quận 7 — Phú Mỹ Hưng và lân cận. Giá tỷ, PN, diện tích chuẩn Golden Record.',
  },
  {
    slug: 'hai-chau',
    label: 'Hải Châu',
    city: 'Đà Nẵng',
    seoTitle: 'Căn hộ bán tại Hải Châu, Đà Nẵng',
    seoDescription:
      'Căn hộ trung tâm Hải Châu, Đà Nẵng — listing đã duyệt, liên hệ CĐT và môi giới qua Ngôi Nhà Hôm Nay.',
  },
  {
    slug: 'ngu-hanh-son',
    label: 'Ngũ Hành Sơn',
    city: 'Đà Nẵng',
    seoTitle: 'Căn hộ bán tại Ngũ Hành Sơn, Đà Nẵng',
    seoDescription:
      'Căn hộ ven biển Ngũ Hành Sơn — dự án nổi bật, bản đồ pin listing, tính trả góp EMI VND.',
  },
];

/** @deprecated use DISTRICTS — kept for SearchPage filter imports */
export const DISTRICT_FILTERS = DISTRICTS.map(({ label, city }) => ({ label, city }));

export const CITY_GROUPS = [
  { city: 'Hà Nội', slugs: ['cau-giay', 'ba-dinh'] as const },
  { city: 'TP.HCM', slugs: ['quan-2', 'quan-7'] as const },
  { city: 'Đà Nẵng', slugs: ['hai-chau', 'ngu-hanh-son'] as const },
] as const;

export function findDistrictBySlug(slug: string): DistrictConfig | undefined {
  return DISTRICTS.find((d) => d.slug === slug);
}

export function districtPath(slug: string) {
  return `/mua/${slug}`;
}

export const NEWS_PLACEHOLDERS = [
  {
    id: 'news-01',
    title: 'Lãi suất vay mua nhà 2026: xu hướng và gợi ý dư nợ an toàn',
    excerpt: 'Tổng hợp mức lãi suất phổ biến tại các ngân hàng và cách ước tính EMI trước khi giữ chỗ.',
    date: '2026-08-12',
  },
  {
    id: 'news-02',
    title: 'Quận 2 sau sáp nhập: checklist mua căn hộ dự án',
    excerpt: 'Những điểm cần kiểm tra pháp lý, tiến độ bàn giao và so sánh giá Golden Record.',
    date: '2026-08-08',
  },
  {
    id: 'news-03',
    title: 'Verified listing là gì trên Ngôi Nhà Hôm Nay?',
    excerpt: 'Giải thích badge Verified, anti-drift và vì sao giá hiển thị khớp hồ sơ CĐT.',
    date: '2026-08-01',
  },
  {
    id: 'news-04',
    title: '5 bước từ tìm kiếm đến giữ chỗ online',
    excerpt: 'Luồng buyer: SERP → chi tiết căn → liên hệ lead → giữ chỗ 30s → thanh toán cọc.',
    date: '2026-07-25',
  },
] as const;
