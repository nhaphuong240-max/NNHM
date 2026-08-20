export function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatPrice(vnd: number): string {
  if (vnd >= 1_000_000_000) {
    return `${(vnd / 1_000_000_000).toFixed(1).replace('.0', '')} tỷ`;
  }
  return new Intl.NumberFormat('vi-VN').format(vnd) + ' ₫';
}

export function formatFullPrice(vnd: number): string {
  return new Intl.NumberFormat('vi-VN').format(vnd) + ' VND';
}
