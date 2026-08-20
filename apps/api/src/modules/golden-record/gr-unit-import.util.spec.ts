import type { UnitEntity } from '../../database/entities/unit.entity';
import { parseUnitImportCsv } from './gr-unit-import.util';

const existing: UnitEntity = {
  id: 'un_01',
  tenantId: 'ten_dev_01',
  projectId: 'prj_sunrise',
  code: 'A-12-05',
  floor: 12,
  area: '68.00',
  bedrooms: 2,
  basePrice: '3850000000',
  status: 'AVAILABLE',
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('parseUnitImportCsv', () => {
  it('detects CREATE vs UPDATE diff (UC-GR-06)', () => {
    const csv = `code,floor,area,bedrooms,basePrice,status
A-12-05,12,68,2,3900000000,AVAILABLE
A-16-01,16,88,3,4800000000,AVAILABLE`;

    const { rows } = parseUnitImportCsv(csv, {
      existingByCode: new Map([['A-12-05', existing]]),
    });

    expect(rows[0].valid).toBe(true);
    expect(rows[0].diffAction).toBe('UPDATE');
    expect(rows[0].diffFields).toContain('basePrice');
    expect(rows[1].diffAction).toBe('CREATE');
  });

  it('flags duplicate code in file and invalid rows', () => {
    const csv = `code,floor,area,bedrooms,basePrice,status
A-12-05,12,68,2,3850000000,AVAILABLE
A-12-05,12,68,2,3850000000,AVAILABLE
,12,68,2,3850000000,AVAILABLE`;

    const { rows } = parseUnitImportCsv(csv, {
      existingByCode: new Map([['A-12-05', existing]]),
    });

    expect(rows[1].duplicateInFile).toBe(true);
    expect(rows[1].valid).toBe(false);
    expect(rows[2].valid).toBe(false);
  });
});
