import { parseLeadImportCsv } from './crm-lead-import.util';

describe('parseLeadImportCsv', () => {
  it('parses header aliases and validates rows', () => {
    const csv = `ho_ten,sdt,email
Nguyễn A,+84901111111,a@example.com
,+84902222222,
Test B,invalid,`;

    const { rows } = parseLeadImportCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0].valid).toBe(true);
    expect(rows[0].fullName).toBe('Nguyễn A');
    expect(rows[1].valid).toBe(false);
    expect(rows[1].errors).toContain('fullName is required');
    expect(rows[2].valid).toBe(false);
    expect(rows[2].errors).toContain('phone format invalid');
  });

  it('flags duplicate phones in tenant', () => {
    const existing = new Set(['+84909998888']);
    const { rows } = parseLeadImportCsv('fullName,phone\nA,+84909998888', { existingPhones: existing });
    expect(rows[0].duplicatePhone).toBe(true);
    expect(rows[0].valid).toBe(false);
  });
});
