import { Link } from 'react-router-dom';
import { brand } from '../../theme/tokens';

type Props = {
  headline?: string;
};

export function HomepageEmptyPicks({ headline = 'Chưa có căn hiển thị trên marketplace' }: Props) {
  return (
    <div
      className="rounded-2xl p-8 text-center space-y-4"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      data-testid="homepage-empty-picks"
    >
      <p className="font-semibold" style={{ color: brand.primaryDark }}>
        {headline}
      </p>
      <p className="text-sm max-w-md mx-auto" style={{ color: brand.muted }}>
        CĐT publish listing qua Moderation — hoặc khám phá dự án, bản đồ và tư vấn AI trong lúc chờ bảng hàng.
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        <Link
          to="/public/search?intent=project"
          className="rounded-full px-4 py-2 text-sm font-semibold text-white no-underline"
          style={{ background: brand.primary }}
        >
          Xem dự án
        </Link>
        <Link
          to="/public/map"
          className="rounded-full px-4 py-2 text-sm font-semibold no-underline"
          style={{ background: brand.background, color: brand.primaryDark, border: `1px solid ${brand.border}` }}
        >
          Bản đồ
        </Link>
        <Link
          to="/public/chat"
          className="rounded-full px-4 py-2 text-sm font-semibold no-underline"
          style={{ background: brand.background, color: brand.primaryDark, border: `1px solid ${brand.border}` }}
        >
          Tư vấn AI
        </Link>
        <Link to="/app" className="text-sm font-semibold underline" style={{ color: brand.primary }}>
          Cổng đối tác
        </Link>
      </div>
    </div>
  );
}
