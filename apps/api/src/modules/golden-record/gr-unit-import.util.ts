import type { UnitEntity, UnitStatus } from '../../database/entities/unit.entity';

export type UnitImportColumnKey =
  | 'code'
  | 'floor'
  | 'area'
  | 'bedrooms'
  | 'basePrice'
  | 'status';

export const DEFAULT_UNIT_IMPORT_COLUMN_MAP: Record<UnitImportColumnKey, string[]> = {
  code: ['code', 'unit_code', 'ma_can', 'macan', 'unit'],
  floor: ['floor', 'tang', 'floor_no'],
  area: ['area', 'dien_tich', 'dientich', 'sqm'],
  bedrooms: ['bedrooms', 'phong_ngu', 'phongngu', 'pn', 'bedroom'],
  basePrice: ['baseprice', 'base_price', 'gia', 'price', 'don_gia'],
  status: ['status', 'trang_thai', 'trangthai', 'inventory_status'],
};

export type UnitImportDiffAction = 'CREATE' | 'UPDATE' | 'UNCHANGED';

export interface ParsedUnitImportRow {
  rowNumber: number;
  code: string;
  floor: number | null;
  area: number;
  bedrooms: number;
  basePrice: number;
  status: UnitStatus;
  valid: boolean;
  errors: string[];
  duplicateInFile?: boolean;
  diffAction?: UnitImportDiffAction;
  diffFields?: string[];
  existingUnitId?: string;
}

const VALID_STATUSES: UnitStatus[] = ['AVAILABLE', 'RESERVED', 'SOLD', 'HOLD'];
export const MAX_UNIT_IMPORT_ROWS = 1000;

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
  key: UnitImportColumnKey,
  customMap?: Partial<Record<UnitImportColumnKey, string>>,
): number {
  const wanted = new Set<string>();
  const custom = customMap?.[key]?.trim();
  if (custom) wanted.add(normalizeHeader(custom));
  for (const alias of DEFAULT_UNIT_IMPORT_COLUMN_MAP[key]) {
    wanted.add(normalizeHeader(alias));
  }
  return headers.findIndex((h) => wanted.has(normalizeHeader(h)));
}

function parseIntField(raw: string, field: string, errors: string[]): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(value)) {
    errors.push(`${field} must be a number`);
    return null;
  }
  return value;
}

function parseFloatField(raw: string, field: string, errors: string[]): number | null {
  const trimmed = raw.replace(/,/g, '').trim();
  if (!trimmed) return null;
  const value = Number.parseFloat(trimmed);
  if (!Number.isFinite(value) || value <= 0) {
    errors.push(`${field} must be a positive number`);
    return null;
  }
  return value;
}

function parseStatus(raw: string, errors: string[]): UnitStatus | null {
  const normalized = raw.trim().toUpperCase();
  if (!normalized) return null;
  if (VALID_STATUSES.includes(normalized as UnitStatus)) {
    return normalized as UnitStatus;
  }
  errors.push(`status must be one of ${VALID_STATUSES.join('|')}`);
  return null;
}

function computeDiff(
  parsed: Pick<ParsedUnitImportRow, 'floor' | 'area' | 'bedrooms' | 'basePrice' | 'status'>,
  existing: UnitEntity,
): { action: UnitImportDiffAction; fields: string[] } {
  const fields: string[] = [];
  if (Number(existing.basePrice) !== parsed.basePrice) fields.push('basePrice');
  if (Number(existing.area) !== parsed.area) fields.push('area');
  if (existing.bedrooms !== parsed.bedrooms) fields.push('bedrooms');
  const existingFloor = existing.floor ?? null;
  if (existingFloor !== parsed.floor) fields.push('floor');
  if (existing.status !== parsed.status) fields.push('status');
  if (fields.length === 0) return { action: 'UNCHANGED', fields: [] };
  return { action: 'UPDATE', fields };
}

export function parseUnitImportCsv(
  csvText: string,
  options: {
    columnMap?: Partial<Record<UnitImportColumnKey, string>>;
    existingByCode?: Map<string, UnitEntity>;
  } = {},
): { rows: ParsedUnitImportRow[]; headers: string[] } {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], headers: [] };
  }

  const headerCells = parseCsvLine(lines[0]).map(normalizeHeader);
  const codeIdx = resolveColumnIndex(headerCells, 'code', options.columnMap);
  const floorIdx = resolveColumnIndex(headerCells, 'floor', options.columnMap);
  const areaIdx = resolveColumnIndex(headerCells, 'area', options.columnMap);
  const bedroomsIdx = resolveColumnIndex(headerCells, 'bedrooms', options.columnMap);
  const priceIdx = resolveColumnIndex(headerCells, 'basePrice', options.columnMap);
  const statusIdx = resolveColumnIndex(headerCells, 'status', options.columnMap);

  if (codeIdx < 0) {
    return {
      headers: headerCells,
      rows: [
        {
          rowNumber: 1,
          code: '',
          floor: null,
          area: 0,
          bedrooms: 0,
          basePrice: 0,
          status: 'AVAILABLE',
          valid: false,
          errors: ['Missing required column: code (ma_can)'],
        },
      ],
    };
  }

  const rows: ParsedUnitImportRow[] = [];
  const seenCodes = new Map<string, number>();
  const dataRowCount = lines.length - 1;

  if (dataRowCount > MAX_UNIT_IMPORT_ROWS) {
    rows.push({
      rowNumber: 0,
      code: '',
      floor: null,
      area: 0,
      bedrooms: 0,
      basePrice: 0,
      status: 'AVAILABLE',
      valid: false,
      errors: [`Max ${MAX_UNIT_IMPORT_ROWS} data rows per import (file has ${dataRowCount})`],
    });
    return { rows, headers: headerCells };
  }

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const errors: string[] = [];
    const code = (cells[codeIdx] ?? '').trim().toUpperCase();

    const floorRaw = floorIdx >= 0 ? (cells[floorIdx] ?? '') : '';
    const areaRaw = areaIdx >= 0 ? (cells[areaIdx] ?? '') : '';
    const bedroomsRaw = bedroomsIdx >= 0 ? (cells[bedroomsIdx] ?? '') : '';
    const priceRaw = priceIdx >= 0 ? (cells[priceIdx] ?? '') : '';
    const statusRaw = statusIdx >= 0 ? (cells[statusIdx] ?? '') : 'AVAILABLE';

    if (!code) errors.push('code is required');
    if (areaIdx < 0) errors.push('area column is required');
    if (bedroomsIdx < 0) errors.push('bedrooms column is required');
    if (priceIdx < 0) errors.push('basePrice column is required');

    const floorParsed = floorRaw.trim()
      ? parseIntField(floorRaw, 'floor', errors)
      : null;
    const areaParsed = areaRaw.trim()
      ? parseFloatField(areaRaw, 'area', errors)
      : (errors.push('area is required'), null);
    const bedroomsParsed = bedroomsRaw.trim()
      ? parseIntField(bedroomsRaw, 'bedrooms', errors)
      : (errors.push('bedrooms is required'), null);
    const basePriceParsed = priceRaw.trim()
      ? parseFloatField(priceRaw, 'basePrice', errors)
      : (errors.push('basePrice is required'), null);
    const statusParsed = parseStatus(statusRaw, errors) ?? 'AVAILABLE';

    let duplicateInFile = false;
    if (code) {
      if (seenCodes.has(code)) duplicateInFile = true;
      else seenCodes.set(code, i + 1);
    }
    if (duplicateInFile) errors.push('duplicate code in file');

    const valid = errors.length === 0;
    const existing = code ? options.existingByCode?.get(code) : undefined;

    let diffAction: UnitImportDiffAction | undefined;
    let diffFields: string[] | undefined;
    let existingUnitId: string | undefined;

    if (valid && code) {
      if (existing) {
        existingUnitId = existing.id;
        const diff = computeDiff(
          {
            floor: floorParsed,
            area: areaParsed!,
            bedrooms: bedroomsParsed!,
            basePrice: basePriceParsed!,
            status: statusParsed,
          },
          existing,
        );
        diffAction = diff.action;
        diffFields = diff.fields;
      } else {
        diffAction = 'CREATE';
        diffFields = [];
      }
    }

    rows.push({
      rowNumber: i + 1,
      code,
      floor: floorParsed,
      area: areaParsed ?? 0,
      bedrooms: bedroomsParsed ?? 0,
      basePrice: basePriceParsed ?? 0,
      status: statusParsed,
      valid,
      errors,
      duplicateInFile: duplicateInFile || undefined,
      diffAction,
      diffFields,
      existingUnitId,
    });
  }

  return { rows, headers: headerCells };
}
