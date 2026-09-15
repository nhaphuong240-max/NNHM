import type { HomepageConfigPayload } from '../../lib/api';
import { brand } from '../../theme/tokens';
import { SectionKicker } from './SectionKicker';

type Props = {
  items: HomepageConfigPayload['newsItems'];
};

export function HomepageNewsSection({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="mt-16" data-testid="homepage-news">
      <SectionKicker>Góc nhìn</SectionKicker>
      <h2 className="nnhn-display text-3xl mt-2 mb-7" style={{ color: brand.ink }}>
        Tin & gợi ý
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {items.slice(0, 4).map((item, i) => (
          <article
            key={item.id}
            className="rounded-[1.5rem] p-6"
            style={{
              background: i % 2 === 0 ? brand.surface : brand.primaryDark,
              color: i % 2 === 0 ? brand.ink : '#F4EFE6',
              border: i % 2 === 0 ? `1px solid ${brand.border}` : 'none',
            }}
          >
            <time className="text-xs opacity-70">{new Date(item.date).toLocaleDateString('vi-VN')}</time>
            <h3 className="nnhn-display text-xl mt-3 leading-snug">{item.title}</h3>
            <p className="text-sm mt-3 leading-relaxed opacity-80">{item.excerpt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
