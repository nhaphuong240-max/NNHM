import { Link } from 'react-router-dom';
import { PublicFooter } from '../../components/public/PublicFooter';
import { PublicTopBar } from '../../components/PublicTopBar';
import { TrustStrip } from '../../components/public/TrustStrip';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PRIVACY_POLICY_VERSION } from '../../lib/constants';
import { brand } from '../../theme/tokens';

export function LegalPrivacyPage() {
  usePageMeta({
    title: `Chính sách bảo mật v${PRIVACY_POLICY_VERSION} | Ngôi Nhà Hôm Nay`,
    description: 'Chính sách xử lý dữ liệu cá nhân (PDPA) của marketplace Ngôi Nhà Hôm Nay.',
  });

  return (
    <div className="min-h-screen flex flex-col nnhn-paper">
      <PublicTopBar />
      <TrustStrip />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full text-sm leading-relaxed" style={{ color: brand.ink }}>
        <p className="nnhn-kicker">PDPA · {PRIVACY_POLICY_VERSION}</p>
        <h1 className="nnhn-display text-4xl mt-2">Chính sách bảo mật</h1>
        <p className="mt-4" style={{ color: brand.muted }}>
          Ngôi Nhà Hôm Nay thu thập họ tên, số điện thoại, email và nội dung yêu cầu để tư vấn BĐS, đặt lịch xem nhà và
          liên hệ lại. Dữ liệu được lưu theo tenant, có timestamp consent, không chia PII cho sàn khác ngoài quy trình
          tranh chấp có kiểm soát.
        </p>
        <h2 className="font-bold text-base mt-8">Mục đích</h2>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Tạo và chăm sóc lead / lịch xem nhà</li>
          <li>Định tuyến agent và đo SLA</li>
          <li>Gửi cảnh báo search đã lưu khi bạn đồng ý marketing</li>
        </ul>
        <h2 className="font-bold text-base mt-8">Quyền của bạn</h2>
        <p className="mt-2" style={{ color: brand.muted }}>
          Bạn có thể yêu cầu truy cập, sửa, hạn chế hoặc xóa dữ liệu không còn cơ sở pháp lý. Form public bắt buộc đồng
          ý phiên bản chính sách này trước khi gửi.
        </p>
        <p className="mt-8">
          <Link to="/" className="font-semibold" style={{ color: brand.primary }}>
            Về trang chủ
          </Link>
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
