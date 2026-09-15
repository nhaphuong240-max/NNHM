import { MigrationInterface, QueryRunner } from 'typeorm';

/** Phase Homepage — CMS config for trending, featured projects, rails. */
export class PhaseHomepage1758120000000 implements MigrationInterface {
  name = 'PhaseHomepage1758120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cms_homepage_config (
        tenant_id varchar(32) PRIMARY KEY,
        payload jsonb NOT NULL,
        updated_by varchar(32),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const defaultPayload = {
      trending: [
        { label: '2PN Quận 7', intent: 'buy', district: 'Quận 7', bedrooms: 2 },
        { label: 'Sunrise Tower', intent: 'project', q: 'Sunrise' },
        { label: 'Dưới 4 tỷ', intent: 'buy', maxPrice: 4000000000 },
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
        { label: 'Dưới 3 tỷ', intent: 'buy', maxPrice: 3000000000 },
        { label: 'Dưới 5 tỷ', intent: 'buy', maxPrice: 5000000000 },
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

    await queryRunner.query(
      `INSERT INTO cms_homepage_config (tenant_id, payload)
       VALUES ('ten_dev_01', $1::jsonb)
       ON CONFLICT (tenant_id) DO NOTHING`,
      [JSON.stringify(defaultPayload)],
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    /* optional table — no destructive rollback */
  }
}
