/** Format VND amount for ZNS template placeholders. */
export function formatVndAmount(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}
