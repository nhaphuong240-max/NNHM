import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { resolveMediaUrl } from '../../lib/media-cdn';
import type { HeroSlide } from '../../lib/featured-projects';
import { brand, formatPrice } from '../../theme/tokens';

type Props = {
  slides: HeroSlide[];
  index: number;
  onIndex: (i: number) => void;
  brandName: string;
  children: ReactNode;
};

function Skyline({ art }: { art: HeroSlide['art'] }) {
  if (art === 'river') {
    return (
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="nnhn-river" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0e2a22" />
            <stop offset="55%" stopColor="#1b5e3b" />
            <stop offset="100%" stopColor="#c45c2a" />
          </linearGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#nnhn-river)" />
        <path d="M0 520 Q300 460 600 540 T1200 500 V800 H0 Z" fill="rgba(18,61,39,0.45)" />
        <rect x="140" y="280" width="90" height="280" fill="rgba(255,252,247,0.08)" />
        <rect x="250" y="200" width="70" height="360" fill="rgba(255,252,247,0.12)" />
        <rect x="340" y="250" width="110" height="310" fill="rgba(255,252,247,0.07)" />
      </svg>
    );
  }
  if (art === 'bay') {
    return (
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="nnhn-bay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#163a4a" />
            <stop offset="50%" stopColor="#1b5e3b" />
            <stop offset="100%" stopColor="#c45c2a" />
          </linearGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#nnhn-bay)" />
        <ellipse cx="900" cy="620" rx="420" ry="80" fill="rgba(255,252,247,0.08)" />
        <path d="M620 420 L760 220 L900 420 Z" fill="rgba(255,252,247,0.14)" />
        <path d="M760 280 L820 180 L880 280 Z" fill="rgba(243,224,210,0.2)" />
      </svg>
    );
  }
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="nnhn-tower" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#123d27" />
          <stop offset="70%" stopColor="#1b5e3b" />
          <stop offset="100%" stopColor="#2e7a4f" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#nnhn-tower)" />
      <rect x="480" y="80" width="160" height="560" fill="rgba(255,252,247,0.1)" />
      <rect x="500" y="120" width="120" height="40" fill="rgba(196,92,42,0.35)" />
      <rect x="360" y="220" width="90" height="420" fill="rgba(255,252,247,0.06)" />
      <rect x="670" y="180" width="100" height="460" fill="rgba(255,252,247,0.08)" />
    </svg>
  );
}

export function HeroProjectStage({ slides, index, onIndex, brandName, children }: Props) {
  const slide = slides[index];

  return (
    <section className="relative min-h-[78vh] overflow-hidden" data-testid="hero-project-stage">
      {slides.length === 0 && (
        <>
          <Skyline art="tower" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#123d27]/95 via-[#123d27]/45 to-transparent" />
        </>
      )}
      {slides.map((s, i) => {
        const src = resolveMediaUrl(s.thumbnailUrl);
        const active = i === index;
        return (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-700 ${active ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={!active}
          >
            <Skyline art={s.art} />
            {src && (
              <img
                src={src}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-45 ${active ? 'nnhn-kenburns' : ''}`}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#123d27]/95 via-[#123d27]/45 to-transparent" />
          </div>
        );
      })}

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-10 pb-8 lg:pt-16 lg:pb-12 flex flex-col min-h-[78vh]">
        <p className="nnhn-kicker" style={{ color: '#E8C4A8' }}>
          Dự án chủ đầu tư
        </p>
        <h1 className="nnhn-display text-3xl sm:text-4xl mt-3 text-white max-w-xl">{brandName}</h1>

        {slide ? (
          <div key={index} className="mt-8 max-w-xl text-white nnhn-hero-copy">
            <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-80">
              {slide.developer} · {slide.code}
            </p>
            <p className="nnhn-display text-4xl sm:text-5xl lg:text-6xl mt-2">{slide.name}</p>
            <p className="mt-4 text-sm sm:text-base leading-relaxed opacity-90 max-w-md">{slide.tagline}</p>
            <p className="mt-3 text-sm opacity-80">
              {[slide.district, slide.city].filter(Boolean).join(', ')}
              {slide.unitCount > 0 ? ` · ${slide.unitCount} căn` : ''}
              {slide.verifiedCount > 0 ? ` · ${slide.verifiedCount} Verified` : ''}
            </p>
            {slide.minPrice > 0 && (
              <p className="nnhn-display text-2xl mt-4" style={{ color: '#E8C4A8' }}>
                {formatPrice(slide.minPrice)}
                {slide.maxPrice > slide.minPrice ? ` – ${formatPrice(slide.maxPrice)}` : ''}
              </p>
            )}
            <Link
              to={`/public/projects/${slide.id}`}
              className="inline-flex mt-6 rounded-full px-5 py-2.5 text-sm font-bold no-underline"
              style={{ background: brand.clay, color: '#fff' }}
            >
              Giới thiệu dự án
            </Link>
          </div>
        ) : (
          <p className="mt-8 max-w-md text-white/85 text-base leading-relaxed">
            Tìm căn đã duyệt, so sánh giá thật, giữ chỗ trong 30 giây.
          </p>
        )}

        <div className="mt-auto pt-10">
          {slides.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onIndex(i)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background: i === index ? 'rgba(255,252,247,0.95)' : 'rgba(255,252,247,0.14)',
                    color: i === index ? brand.primaryDark : '#F4EFE6',
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          <div className="nnhn-search-pill nnhn-card p-2 sm:p-3 max-w-3xl">{children}</div>
        </div>
      </div>
    </section>
  );
}
