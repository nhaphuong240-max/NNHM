/** VND home-loan EMI — standard amortizing formula */
export type EmiInput = {
  propertyPrice: number;
  downPaymentPercent: number;
  annualRatePercent: number;
  tenureYears: number;
};

export type EmiResult = {
  loanAmount: number;
  downPaymentAmount: number;
  monthlyEmi: number;
  totalPayment: number;
  totalInterest: number;
};

export const EMI_DEFAULTS: EmiInput = {
  propertyPrice: 3_000_000_000,
  downPaymentPercent: 20,
  annualRatePercent: 8.5,
  tenureYears: 20,
};

export function calculateEmi(input: EmiInput): EmiResult {
  const downPaymentAmount = Math.round(input.propertyPrice * (input.downPaymentPercent / 100));
  const loanAmount = Math.max(0, input.propertyPrice - downPaymentAmount);
  const n = Math.max(0, Math.round(input.tenureYears * 12));
  const monthlyRate = input.annualRatePercent / 100 / 12;

  if (loanAmount === 0 || n === 0) {
    return {
      loanAmount,
      downPaymentAmount,
      monthlyEmi: 0,
      totalPayment: downPaymentAmount,
      totalInterest: 0,
    };
  }

  if (monthlyRate === 0) {
    const monthlyEmi = loanAmount / n;
    return {
      loanAmount,
      downPaymentAmount,
      monthlyEmi,
      totalPayment: downPaymentAmount + loanAmount,
      totalInterest: 0,
    };
  }

  const factor = Math.pow(1 + monthlyRate, n);
  const monthlyEmi = (loanAmount * monthlyRate * factor) / (factor - 1);
  const totalPayment = downPaymentAmount + monthlyEmi * n;

  return {
    loanAmount,
    downPaymentAmount,
    monthlyEmi,
    totalPayment,
    totalInterest: monthlyEmi * n - loanAmount,
  };
}
