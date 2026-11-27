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

/** VN mobile in E.164. Other shapes are rejected. */
export function toE164Vn(raw: string): string | null {
  const national = normalizePhone(raw);
  if (!/^0\d{9}$/.test(national)) return null;
  return `+84${national.slice(1)}`;
}
