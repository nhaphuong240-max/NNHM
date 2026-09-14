import { DemandPolicyService } from './demand-policy.service';
import { DEFAULT_TENANT_DEMAND_POLICY } from './demand-policy.types';

describe('DemandPolicyService', () => {
  const policies = {
    findOne: jest.fn(),
    save: jest.fn(async (row: unknown) => row),
  };
  const audit = { append: jest.fn(async () => undefined) };

  const service = new DemandPolicyService(
    policies as never,
    audit as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    policies.findOne.mockResolvedValue(null);
  });

  it('returns default policy when tenant has no row', async () => {
    const res = await service.getPolicy('ten_dev_01');
    expect(res.data.attributes.isDefault).toBe(true);
    expect(res.data.attributes.payload.sla.timezone).toBe('Asia/Ho_Chi_Minh');
    expect(res.data.attributes.payload.dealProtection.protectionDays).toBe(30);
  });

  it('patches and increments version', async () => {
    policies.findOne.mockResolvedValueOnce({
      tenantId: 'ten_dev_01',
      version: 2,
      payload: { ...DEFAULT_TENANT_DEMAND_POLICY },
    });
    const res = await service.patchPolicy(
      'ten_dev_01',
      { sla: { hotFirstTouchMinutes: 4 } },
      'usr_ops',
    );
    expect(res.data.attributes.version).toBe(3);
    expect(res.data.attributes.payload.sla.hotFirstTouchMinutes).toBe(4);
    expect(audit.append).toHaveBeenCalled();
  });
});
