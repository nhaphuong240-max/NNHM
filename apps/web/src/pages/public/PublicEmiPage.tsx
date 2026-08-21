import { PublicTopBar } from '../../components/PublicTopBar';
import { EmiCalculator } from '../../components/public/EmiCalculator';
import { JsonLd } from '../../components/public/JsonLd';
import { PublicFooter } from '../../components/public/PublicFooter';
import { TrustStrip } from '../../components/public/TrustStrip';
import { usePageMeta } from '../../hooks/usePageMeta';
import { brand } from '../../theme/tokens';

export function PublicEmiPage() {
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ngoinhahomnay.vn';

  usePageMeta({
    title: 'Tính trả góp mua nhà (EMI) | Ngôi Nhà Hôm Nay',
    description:
      'Công cụ ước tính khoản trả hàng tháng (EMI) cho vay mua nhà tại Việt Nam — lãi suất, trả trước, thời hạn vay.',
    canonical: `${siteOrigin}/public/tools/emi`,
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: brand.background }}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Tính trả góp EMI — Ngôi Nhà Hôm Nay',
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'VND' },
        }}
      />
      <PublicTopBar />
      <TrustStrip />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 w-full">
        <EmiCalculator />
        <p className="text-xs mt-6 leading-relaxed" style={{ color: brand.muted }}>
          Kết quả mang tính tham khảo. Lãi suất thực tế phụ thuộc ngân hàng, hồ sơ tín dụng và chương trình ưu đãi.
          Liên hệ tư vấn trước khi cam kết giữ chỗ hoặc ký hợp đồng mua bán.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
