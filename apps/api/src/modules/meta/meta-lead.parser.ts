import type { MetaFieldData } from './meta.types';

const NAME_KEYS = ['full_name', 'name', 'ho_ten', 'họ_tên'];
const PHONE_KEYS = ['phone_number', 'phone', 'mobile', 'sdt', 'so_dien_thoai'];
const EMAIL_KEYS = ['email', 'email_address'];
const MESSAGE_KEYS = ['message', 'note', 'notes', 'project_interest', 'du_an_quan_tam'];
const UNIT_KEYS = ['unit_id', 'unit', 'ma_can', 'listing_id'];

function pickField(map: Map<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = map.get(key);
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

export function normalizeVnPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('84')) return `+${digits}`;
  if (digits.startsWith('0')) return `+84${digits.slice(1)}`;
  return `+84${digits}`;
}

export function parseMetaFieldData(fields: MetaFieldData[]) {
  const map = new Map<string, string>();
  for (const field of fields) {
    const key = field.name.trim().toLowerCase();
    const value = field.values?.[0]?.trim();
    if (key && value) map.set(key, value);
  }

  const fullName = pickField(map, NAME_KEYS);
  const phoneRaw = pickField(map, PHONE_KEYS);
  const email = pickField(map, EMAIL_KEYS);
  const message = pickField(map, MESSAGE_KEYS);
  const unitHint = pickField(map, UNIT_KEYS);

  if (!fullName) {
    throw new Error('Meta lead missing full_name field');
  }
  if (!phoneRaw) {
    throw new Error('Meta lead missing phone_number field');
  }

  return {
    fullName,
    phone: normalizeVnPhone(phoneRaw),
    email,
    message,
    unitId: unitHint?.startsWith('un_') ? unitHint : undefined,
    listingId: unitHint?.startsWith('ls_') ? unitHint : undefined,
  };
}
