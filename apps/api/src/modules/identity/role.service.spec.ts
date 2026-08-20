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
  });

  it('updates tenant project scope policy', () => {
    const updated = service.updatePolicy('ten_dev_01', {
      projectScopes: [{ role: 'AGENT', projectIds: ['prj_sunrise'] }],
    });
    expect(updated.data.projectScopes[0].projectIds).toContain('prj_sunrise');
  });
});
