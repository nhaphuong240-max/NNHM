export type HomepageTrendingItem = {
  label: string;
  intent?: 'buy' | 'rent' | 'project';
  q?: string;
  district?: string;
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
};

export type HomepageFeaturedProjectMeta = {
  projectId: string;
  developer?: string;
  tagline?: string;
  art?: 'river' | 'tower' | 'bay';
  sortOrder?: number;
};

export type HomepageQuickChip = {
  label: string;
  intent?: 'buy' | 'rent' | 'project';
  q?: string;
  district?: string;
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
};

export type HomepageNewsItem = {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  href?: string;
};

export type HomepageTrustFallback = {
  headline: string;
  items: { value: string; label: string }[];
};

export type HomepageMapBanner = {
  enabled: boolean;
  title: string;
  subtitle: string;
};

export type HomepageSections = {
  trending: boolean;
  picks: boolean;
  projects: boolean;
  quickChips: boolean;
  districts: boolean;
  map: boolean;
  tools: boolean;
  news: boolean;
};

export type HomepageConfigPayload = {
  trending: HomepageTrendingItem[];
  featuredProjects: HomepageFeaturedProjectMeta[];
  quickChips: HomepageQuickChip[];
  newsItems: HomepageNewsItem[];
  trustFallback: HomepageTrustFallback;
  mapBanner: HomepageMapBanner;
  sections: HomepageSections;
  picksLimit: number;
};

export const DEFAULT_HOMEPAGE_CONFIG: HomepageConfigPayload = {
  trending: [
    { label: '2PN Quận 7', intent: 'buy', district: 'Quận 7', bedrooms: 2 },
    { label: 'Sunrise Tower', intent: 'project', q: 'Sunrise' },
    { label: 'Dưới 4 tỷ', intent: 'buy', maxPrice: 4_000_000_000 },
    { label: 'Cầu Giấy', intent: 'buy', district: 'Cầu Giấy' },
  ],
  featuredProjects: [
    {
      projectId: 'prj_mkp_hcm',
      developer: 'Pearl Land',
      tagline: 'Căn hộ ven sông Sài Gòn — bảng hàng Verified, giá Golden Record.',
      art: 'river',
      sortOrder: 0,
    },
    {
      projectId: 'prj_sunrise',
      developer: 'Sunrise Development',
      tagline: 'Tòa căn hộ Cầu Giấy — giữ chỗ 30 giây, so sánh căn trên cùng mặt tiền.',
      art: 'tower',
      sortOrder: 1,
    },
    {
      projectId: 'prj_mkp_dn',
      developer: 'Bay Group',
      tagline: 'View vịnh Đà Nẵng — listing đã duyệt, liên hệ CĐT ngay trên trang dự án.',
      art: 'bay',
      sortOrder: 2,
    },
  ],
  quickChips: [
    { label: '2PN', intent: 'buy', bedrooms: 2 },
    { label: '3PN', intent: 'buy', bedrooms: 3 },
    { label: 'Dưới 3 tỷ', intent: 'buy', maxPrice: 3_000_000_000 },
    { label: 'Dưới 5 tỷ', intent: 'buy', maxPrice: 5_000_000_000 },
  ],
  newsItems: [
    {
      id: 'news-01',
      title: 'Lãi suất vay mua nhà 2026: xu hướng và gợi ý dư nợ an toàn',
      excerpt:
        'Tổng hợp mức lãi suất phổ biến tại các ngân hàng và cách ước tính EMI trước khi giữ chỗ.',
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
  ],
  trustFallback: {
    headline: 'Marketplace Verified · Golden Record',
    items: [
      { value: 'GR', label: 'Giá minh bạch' },
      { value: '30s', label: 'Giữ chỗ online' },
      { value: 'PDPA', label: 'Consent chuẩn' },
    ],
  },
  mapBanner: {
    enabled: true,
    title: 'Xem căn trên bản đồ',
    subtitle: 'Pin listing · zoom quận · chọn căn trực quan trên Leaflet',
  },
  sections: {
    trending: true,
    picks: true,
    projects: true,
    quickChips: true,
    districts: true,
    map: true,
    tools: true,
    news: true,
  },
  picksLimit: 6,
};
