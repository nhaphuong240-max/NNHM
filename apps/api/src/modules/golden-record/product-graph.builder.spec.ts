import { UnitEntity } from '../../database/entities/unit.entity';
import { buildProductGraph, parseBuildingCode } from './golden-record.types';

describe('buildProductGraph', () => {
  const project = { id: 'prj_sunrise', code: 'SUNRISE-A', name: 'Sunrise Tower A' };

  const units: UnitEntity[] = [
    {
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
    },
    {
      id: 'un_02',
      tenantId: 'ten_dev_01',
      projectId: 'prj_sunrise',
      code: 'A-12-06',
      floor: 12,
      area: '72.50',
      bedrooms: 2,
      basePrice: '4100000000',
      status: 'AVAILABLE',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'un_04',
      tenantId: 'ten_dev_01',
      projectId: 'prj_sunrise',
      code: 'B-08-02',
      floor: 8,
      area: '55.00',
      bedrooms: 1,
      basePrice: '2900000000',
      status: 'SOLD',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as UnitEntity[];

  it('parses building code from unit code', () => {
    expect(parseBuildingCode('A-12-05')).toBe('A');
    expect(parseBuildingCode('B-08-02')).toBe('B');
  });

  it('builds project → building → floor → unit hierarchy', () => {
    const graph = buildProductGraph(project, units);
    expect(graph.project.stats.total).toBe(3);
    expect(graph.buildings).toHaveLength(2);
    expect(graph.buildings[0].code).toBe('A');
    expect(graph.buildings[0].floors).toHaveLength(1);
    expect(graph.buildings[0].floors[0].units).toHaveLength(2);
    expect(graph.nodes.some((n) => n.type === 'unit' && n.id === 'un_01')).toBe(true);
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  it('computes absorption on building B with sold unit', () => {
    const graph = buildProductGraph(project, units);
    const blockB = graph.buildings.find((b) => b.code === 'B');
    expect(blockB?.stats.sold).toBe(1);
    expect(blockB?.absorptionRate).toBe(1);
  });
});
