import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { calculateEmi, EMI_DEFAULTS, type EmiInput } from '../../lib/emi';
import { brand, formatPrice, formatVnd } from '../../theme/tokens';

type Props = {
  compact?: boolean;
  initialPrice?: number;
};

export function EmiCalculator({ compact = false, initialPrice }: Props) {
  const [input, setInput] = useState<EmiInput>({
    ...EMI_DEFAULTS,
    propertyPrice: initialPrice ?? EMI_DEFAULTS.propertyPrice,
  });

  const result = useMemo(() => calculateEmi(input), [input]);

  function setNumber<K extends keyof EmiInput>(key: K, raw: string) {
    const n = Number(raw.replace(/\D/g, '')) || 0;
    setInput((prev) => ({ ...prev, [key]: n }));
  }

  return (
    <div
      className={compact ? 'space-y-4' : 'rounded-2xl p-6 space-y-5'}
      style={compact ? undefined : { background: brand.surface, border: `1px solid ${brand.border}` }}
      data-testid="emi-calculator"
    >
      {!compact && (
        <div>
          <h2 className="text-lg font-bold" style={{ color: brand.ink }}>
            Tính trả góp (EMI)
          </h2>
          <p className="text-sm mt-1" style={{ color: brand.muted }}>
            Ước tính gốc + lãi hàng tháng theo lãi suất VN — tham khảo trước khi liên hệ tư vấn vay.
          </p>
        </div>
      )}

      <div className={compact ? 'grid gap-3' : 'grid sm:grid-cols-2 gap-4'}>
        <label className="block text-sm">
          <span className="font-medium" style={{ color: brand.ink }}>Giá căn (VND)</span>
          <input
            type="text"
            inputMode="numeric"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm border outline-none"
            style={{ borderColor: brand.border }}
            value={input.propertyPrice.toLocaleString('vi-VN')}
            onChange={(e) => setNumber('propertyPrice', e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium" style={{ color: brand.ink }}>
            Trả trước ({input.downPaymentPercent}%)
          </span>
          <input
            type="range"
            min={0}
            max={70}
            step={5}
            className="mt-2 w-full"
            value={input.downPaymentPercent}
            onChange={(e) => setInput((p) => ({ ...p, downPaymentPercent: Number(e.target.value) }))}
          />
          <span className="text-xs" style={{ color: brand.muted }}>
            {formatVnd(result.downPaymentAmount)}
          </span>
        </label>
        <label className="block text-sm">
          <span className="font-medium" style={{ color: brand.ink }}>
            Lãi suất ({input.annualRatePercent}%/năm)
          </span>
          <input
            type="range"
            min={6}
            max={12}
            step={0.25}
            className="mt-2 w-full"
            value={input.annualRatePercent}
            onChange={(e) => setInput((p) => ({ ...p, annualRatePercent: Number(e.target.value) }))}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium" style={{ color: brand.ink }}>
            Thời hạn ({input.tenureYears} năm)
          </span>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            className="mt-2 w-full"
            value={input.tenureYears}
            onChange={(e) => setInput((p) => ({ ...p, tenureYears: Number(e.target.value) }))}
          />
        </label>
      </div>

      <div
        className="rounded-xl p-4 grid sm:grid-cols-3 gap-4"
        style={{ background: brand.background }}
      >
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: brand.muted }}>
            Trả hàng tháng
          </p>
          <p className="text-2xl font-extrabold mt-1" style={{ color: brand.primary }}>
            {formatVnd(Math.round(result.monthlyEmi))}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: brand.muted }}>
            Vay gốc
          </p>
          <p className="text-lg font-bold mt-1">{formatPrice(result.loanAmount)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: brand.muted }}>
            Tổng lãi ước tính
          </p>
          <p className="text-lg font-bold mt-1">{formatPrice(Math.round(result.totalInterest))}</p>
        </div>
      </div>

      {compact && (
        <Link to="/public/tools/emi" className="text-sm font-semibold inline-block" style={{ color: brand.primary }}>
          Mở công cụ đầy đủ →
        </Link>
      )}
    </div>
  );
}
