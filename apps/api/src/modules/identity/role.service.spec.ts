import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';

describe('RoleService', () => {
  let service: RoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleService],
    }).compile();
    service = module.get(RoleService);
  });

  it('returns role catalog (SCR-ADMIN-021)', () => {
    const result = service.getCatalog();
    expect(result.data.length).toBeGreaterThanOrEqual(5);
    expect(result.data.some((r) => r.id === 'OPS_ADMIN')).toBe(true);
    expect(result.data.some((r) => r.id === 'PROCEDURE_STAFF')).toBe(true);
    expect(result.data.find((r) => r.id === 'PROCEDURE_STAFF')?.permissions).toContain('contracts.send_sign_link');
    expect(result.data.find((r) => r.id === 'AGENT')?.permissions).not.toContain('contracts.send_sign_link');
    expect(result.data.find((r) => r.id === 'SALES_DIRECTOR')?.permissions).toContain('contracts.approve');
    expect(result.data.find((r) => r.id === 'SALES_DIRECTOR')?.label).toContain('Giám đốc kinh doanh');
    expect(result.data.find((r) => r.id === 'FINANCE_ADMIN')?.permissions).toContain('kyc.approve');
    expect(result.data.find((r) => r.id === 'ADMIN')?.permissions).not.toContain('contracts.approve');
    expect(result.data.find((r) => r.id === 'ADMIN')?.permissions).not.toContain('kyc.approve');
  });

  it('updates tenant project scope policy', () => {
    const updated = service.updatePolicy('ten_dev_01', {
      projectScopes: [{ role: 'AGENT', projectIds: ['prj_sunrise'] }],
    });
    expect(updated.data.projectScopes[0].projectIds).toContain('prj_sunrise');
  });
});
