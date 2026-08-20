export type LeadImportColumnKey = 'fullName' | 'phone' | 'email' | 'unitId' | 'message';

export const DEFAULT_IMPORT_COLUMN_MAP: Record<LeadImportColumnKey, string[]> = {
  fullName: ['fullName', 'full_name', 'name', 'ho_ten', 'hoten'],
  phone: ['phone', 'mobile', 'sdt', 'so_dien_thoai', 'tel'],
  email: ['email', 'e_mail'],
  unitId: ['unitId', 'unit_id', 'unit', 'ma_can'],
  message: ['message', 'note', 'notes', 'ghi_chu'],
};

export interface ParsedLeadImportRow {
  rowNumber: number;
  fullName: string;
  phone: string;
  email?: string;
  unitId?: string;
  message?: string;
  valid: boolean;
  errors: string[];
  duplicatePhone?: boolean;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function resolveColumnIndex(
  headers: string[],
  key: LeadImportColumnKey,
  customMap?: Partial<Record<LeadImportColumnKey, string>>,
): number {
  const wanted = new Set<string>();
  const custom = customMap?.[key]?.trim();
  if (custom) wanted.add(normalizeHeader(custom));
  for (const alias of DEFAULT_IMPORT_COLUMN_MAP[key]) {
    wanted.add(normalizeHeader(alias));
  }

  return headers.findIndex((h) => wanted.has(normalizeHeader(h)));
}

function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('0')) return `+84${trimmed.slice(1)}`;
  return trimmed;
}

export function parseLeadImportCsv(
  csvText: string,
  options: {
    columnMap?: Partial<Record<LeadImportColumnKey, string>>;
    existingPhones?: Set<string>;
  } = {},
): { rows: ParsedLeadImportRow[]; headers: string[] } {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], headers: [] };
  }

  const headerCells = parseCsvLine(lines[0]).map(normalizeHeader);
  const nameIdx = resolveColumnIndex(headerCells, 'fullName', options.columnMap);
  const phoneIdx = resolveColumnIndex(headerCells, 'phone', options.columnMap);
  const emailIdx = resolveColumnIndex(headerCells, 'email', options.columnMap);
  const unitIdx = resolveColumnIndex(headerCells, 'unitId', options.columnMap);
  const messageIdx = resolveColumnIndex(headerCells, 'message', options.columnMap);

  const rows: ParsedLeadImportRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const fullName = nameIdx >= 0 ? (cells[nameIdx] ?? '').trim() : '';
    const phone = phoneIdx >= 0 ? normalizePhone(cells[phoneIdx] ?? '') : '';
    const email = emailIdx >= 0 ? (cells[emailIdx] ?? '').trim() : undefined;
    const unitId = unitIdx >= 0 ? (cells[unitIdx] ?? '').trim() : undefined;
    const message = messageIdx >= 0 ? (cells[messageIdx] ?? '').trim() : undefined;

    const errors: string[] = [];
    if (!fullName) errors.push('fullName is required');
    if (!phone) errors.push('phone is required');
    else if (!/^\+?[0-9]{8,15}$/.test(phone.replace(/\s/g, ''))) {
      errors.push('phone format invalid');
    }

    const duplicatePhone = phone ? options.existingPhones?.has(phone) ?? false : false;
    if (duplicatePhone) errors.push('duplicate phone in tenant');

    rows.push({
      rowNumber: i + 1,
      fullName,
      phone,
      email: email || undefined,
      unitId: unitId || undefined,
      message: message || undefined,
      valid: errors.length === 0,
      errors,
      duplicatePhone: duplicatePhone || undefined,
    });
  }

  return { rows, headers: headerCells };
}
