/** Canonical VN mobile digits: 0xxxxxxxxx */
export function normalizePhone(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length >= 11) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function phonesMatch(a: string, b: string): boolean {
  const left = normalizePhone(a);
  const right = normalizePhone(b);
  return left.length >= 9 && left === right;
}
