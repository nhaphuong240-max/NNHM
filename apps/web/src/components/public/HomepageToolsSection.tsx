import { Link } from 'react-router-dom';
import { EmiCalculator } from './EmiCalculator';
import { SectionKicker } from './SectionKicker';
import { brand } from '../../theme/tokens';

type Props = {
  samplePrice?: number;
};

export function HomepageToolsSection({ samplePrice }: Props) {
  return (
    <section className="mt-16 grid lg:grid-cols-[1fr_1.1fr] gap-10 items-start" data-testid="homepage-tools">
      <div className="space-y-4">
        <div>
          <SectionKicker>Công cụ</SectionKicker>
          <h2 className="nnhn-display text-3xl mt-2" style={{ color: brand.ink }}>
            Công cụ mua nhà
          </h2>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: brand.muted }}>
            Ước tính trả góp trước khi liên hệ tư vấn — lãi suất và thời hạn điều chỉnh được.
          </p>
        </div>
        <Link
          to="/public/chat"
          className="block rounded-xl p-4 no-underline"
          style={{ background: brand.accentSoft, border: `1px solid ${brand.accent}` }}
        >
          <p className="font-semibold text-sm" style={{ color: brand.primaryDark }}>
            Tư vấn AI 24/7
          </p>
          <p className="text-xs mt-1" style={{ color: brand.muted }}>
            Hỏi giá, so sánh căn, để lại SĐT — agent gọi lại trong SLA.
          </p>
        </Link>
      </div>
      <div className="nnhn-card p-5 sm:p-6">
        <EmiCalculator compact initialPrice={samplePrice} />
      </div>
    </section>
  );
}
