import { MigrationInterface, QueryRunner } from 'typeorm';

/** Wave P1 — qualification, CMS/SEO, DSR, attribution, open day, viewing checklist. */
export class P1Wave1758070000000 implements MigrationInterface {
  name = 'P1Wave1758070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE listings
      ADD COLUMN IF NOT EXISTS verification_level varchar(2) NOT NULL DEFAULT 'V0'
    `);
    await queryRunner.query(`
      UPDATE listings SET verification_level = 'V2' WHERE verified = true AND verification_level = 'V0'
    `);

    await queryRunner.query(`
      ALTER TABLE search_index_docs
      ADD COLUMN IF NOT EXISTS verification_level varchar(2) NOT NULL DEFAULT 'V0'
    `);
    await queryRunner.query(`
      UPDATE search_index_docs SET verification_level = 'V2' WHERE verified = true
    `);

    await queryRunner.query(`
      ALTER TABLE crm_viewings
      ADD COLUMN IF NOT EXISTS checklist jsonb,
      ADD COLUMN IF NOT EXISTS checklist_completed_at timestamptz
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS geo_areas (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        slug varchar(64) NOT NULL,
        label varchar(128) NOT NULL,
        city varchar(64) NOT NULL,
        level varchar(16) NOT NULL DEFAULT 'district',
        parent_id varchar(32),
        seo_title varchar(255),
        seo_description text,
        listing_count int NOT NULL DEFAULT 0,
        is_indexable boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, slug)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cms_pages (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        slug varchar(128) NOT NULL,
        page_type varchar(32) NOT NULL,
        title varchar(255) NOT NULL,
        body text NOT NULL DEFAULT '',
        status varchar(16) NOT NULL DEFAULT 'DRAFT',
        geo_area_id varchar(32),
        project_id varchar(32),
        meta jsonb,
        published_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, slug)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dsr_polygons (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        project_id varchar(32) NOT NULL,
        level varchar(16) NOT NULL,
        ref_id varchar(32) NOT NULL,
        label varchar(128) NOT NULL,
        geojson jsonb NOT NULL,
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dsr_share_links (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        token varchar(64) NOT NULL UNIQUE,
        unit_id varchar(32),
        project_id varchar(32),
        lead_id varchar(32),
        visitor_id varchar(64),
        expires_at timestamptz NOT NULL,
        open_count int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS attribution_touchpoints (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        lead_id varchar(32) NOT NULL,
        channel varchar(32) NOT NULL,
        source varchar(64),
        campaign_id varchar(64),
        metadata jsonb,
        occurred_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS open_day_events (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        project_id varchar(32) NOT NULL,
        title varchar(255) NOT NULL,
        starts_at timestamptz NOT NULL,
        ends_at timestamptz NOT NULL,
        capacity int NOT NULL DEFAULT 50,
        qr_secret varchar(64) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'OPEN',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS open_day_rsvps (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        event_id varchar(32) NOT NULL,
        lead_id varchar(32),
        full_name varchar(128) NOT NULL,
        phone varchar(32) NOT NULL,
        qr_token varchar(64) NOT NULL UNIQUE,
        checked_in_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS crm_notify_deliveries (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        lead_id varchar(32),
        channel varchar(8) NOT NULL,
        template_id varchar(64) NOT NULL,
        phone varchar(32) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'QUEUED',
        external_id varchar(64),
        payload jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        delivered_at timestamptz
      )
    `);

    const districts = [
      ['geo_cau_giay', 'cau-giay', 'Cầu Giấy', 'Hà Nội'],
      ['geo_ba_dinh', 'ba-dinh', 'Ba Đình', 'Hà Nội'],
      ['geo_q2', 'quan-2', 'Quận 2', 'TP.HCM'],
      ['geo_q7', 'quan-7', 'Quận 7', 'TP.HCM'],
      ['geo_hai_chau', 'hai-chau', 'Hải Châu', 'Đà Nẵng'],
      ['geo_ngu_hanh_son', 'ngu-hanh-son', 'Ngũ Hành Sơn', 'Đà Nẵng'],
    ];
    for (const [id, slug, label, city] of districts) {
      await queryRunner.query(
        `INSERT INTO geo_areas (id, tenant_id, slug, label, city, level, seo_title, seo_description, is_indexable)
         VALUES ($1, 'ten_dev_01', $2, $3, $4, 'district', $5, $6, true)
         ON CONFLICT (tenant_id, slug) DO NOTHING`,
        [
          id,
          slug,
          label,
          city,
          `Căn hộ bán tại ${label}, ${city}`,
          `Danh sách căn hộ Verified tại ${label} — Golden Record trên Ngôi Nhà Hôm Nay.`,
        ],
      );
    }

    await queryRunner.query(`
      INSERT INTO dsr_polygons (id, tenant_id, project_id, level, ref_id, label, geojson, sort_order)
      VALUES
        ('dsr_mp_sunrise', 'ten_dev_01', 'prj_sunrise', 'masterplan', 'prj_sunrise', 'Sunrise masterplan',
         '{"type":"Polygon","coordinates":[[[106.7205,10.7285],[106.7235,10.7285],[106.7235,10.7315],[106.7205,10.7315],[106.7205,10.7285]]]}', 0),
        ('dsr_t_a', 'ten_dev_01', 'prj_sunrise', 'tower', 'tower_a', 'Tháp A',
         '{"type":"Polygon","coordinates":[[[106.7210,10.7290],[106.7222,10.7290],[106.7222,10.7305],[106.7210,10.7305],[106.7210,10.7290]]]}', 1)
      ON CONFLICT (id) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO open_day_events (id, tenant_id, project_id, title, starts_at, ends_at, capacity, qr_secret, status)
      VALUES (
        'od_sunrise_01', 'ten_dev_01', 'prj_sunrise',
        'Open day Sunrise Tower A',
        NOW() + INTERVAL '7 days',
        NOW() + INTERVAL '7 days 4 hours',
        40, 'od_secret_sunrise_v1', 'OPEN'
      )
      ON CONFLICT (id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS crm_notify_deliveries`);
    await queryRunner.query(`DROP TABLE IF EXISTS open_day_rsvps`);
    await queryRunner.query(`DROP TABLE IF EXISTS open_day_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS attribution_touchpoints`);
    await queryRunner.query(`DROP TABLE IF EXISTS dsr_share_links`);
    await queryRunner.query(`DROP TABLE IF EXISTS dsr_polygons`);
    await queryRunner.query(`DROP TABLE IF EXISTS cms_pages`);
    await queryRunner.query(`DROP TABLE IF EXISTS geo_areas`);
    await queryRunner.query(`
      ALTER TABLE crm_viewings DROP COLUMN IF EXISTS checklist_completed_at, DROP COLUMN IF EXISTS checklist
    `);
    await queryRunner.query(`
      ALTER TABLE search_index_docs DROP COLUMN IF EXISTS verification_level
    `);
    await queryRunner.query(`
      ALTER TABLE listings DROP COLUMN IF EXISTS verification_level
    `);
  }
}
