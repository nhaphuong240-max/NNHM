import { AntiDriftService } from './anti-drift.service';
import type { UnitEntity } from '../../database/entities/unit.entity';

describe('AntiDriftService', () => {
  const service = new AntiDriftService();

  const unit: UnitEntity = {
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

  it('returns PASS when marketing matches GR', () => {
    const report = service.evaluate(unit, { priceDisplay: 3850000000 });
    expect(report.status).toBe('PASS');
  });

  it('returns FLAG on moderate price drift', () => {
    const report = service.evaluate(unit, { priceDisplay: 4050000000 });
    expect(report.status).toBe('FLAG');
  });

  it('returns BLOCK on large price drift', () => {
    const report = service.evaluate(unit, { priceDisplay: 4500000000 });
    expect(report.status).toBe('BLOCK');
  });
});
