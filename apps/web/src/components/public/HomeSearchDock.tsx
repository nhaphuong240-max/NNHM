import type { FormEvent } from 'react';
import { brand } from '../../theme/tokens';

const INTENTS = [
  { id: 'buy', label: 'Mua' },
  { id: 'rent', label: 'Thuê' },
  { id: 'project', label: 'Dự án' },
] as const;

const CITIES = [
  { label: 'Hà Nội', q: 'Hà Nội' },
  { label: 'TP.HCM', q: 'HCM' },
  { label: 'Đà Nẵng', q: 'Đà Nẵng' },
] as const;

export type SearchIntent = (typeof INTENTS)[number]['id'];

type Props = {
  intent: SearchIntent;
  onIntent: (id: SearchIntent) => void;
  q: string;
  onQ: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCity: (query: string) => void;
};

export function HomeSearchDock({ intent, onIntent, q, onQ, onSubmit, onCity }: Props) {
  return (
    <div className="relative z-20 max-w-6xl mx-auto px-4 -mt-10 lg:-mt-14" data-testid="home-search-dock">
      <div className="nnhn-search-pill nnhn-card p-2 sm:p-2.5">
        <form onSubmit={onSubmit} className="flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="flex shrink-0 p-0.5 rounded-full" style={{ background: brand.background }}>
            {INTENTS.map((tab) => {
              const active = intent === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className="flex-1 lg:flex-none rounded-full px-4 py-2 text-sm font-semibold"
                  style={{
                    background: active ? brand.primary : 'transparent',
                    color: active ? '#fff' : brand.ink,
                  }}
                  onClick={() => onIntent(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <label className="sr-only" htmlFor="home-search">
            Tìm khu vực, dự án
          </label>
          <input
            id="home-search"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="Khu vực, dự án, chủ đầu tư"
            className="flex-1 min-w-0 px-4 py-3 text-sm outline-none rounded-full"
            style={{ color: brand.ink, background: brand.background }}
          />
          <button
            type="submit"
            className="shrink-0 px-7 py-3 text-sm font-bold text-white rounded-full"
            style={{ background: brand.clay }}
          >
            Tìm kiếm
          </button>
        </form>
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 px-1 text-sm" style={{ color: brand.muted }}>
        <span className="nnhn-kicker">Nhanh</span>
        {CITIES.map((city) => (
          <button
            key={city.label}
            type="button"
            className="font-semibold hover:underline"
            style={{ color: brand.primaryDark }}
            onClick={() => onCity(city.q)}
          >
            {city.label}
          </button>
        ))}
      </p>
    </div>
  );
}
