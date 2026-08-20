import { groupBuildingsFromPins, unitToMapPin } from './public-map.util';

describe('public-map.util', () => {
  it('maps unit to geo pin with height', () => {
    const pin = unitToMapPin(
      {
        id: 'un_01',
        code: 'A-1205',
        basePrice: 3_900_000_000,
        status: 'AVAILABLE',
        bedrooms: 2,
        area: 72,
        floor: 12,
        projectId: 'proj_sunrise',
      },
      0,
    );
    expect(pin.unitId).toBe('un_01');
    expect(pin.heightM).toBeGreaterThan(10);
    expect(pin.lat).toBeGreaterThan(10.7);
  });

  it('groups pins into buildings', () => {
    const pins = [
      unitToMapPin(
        { id: 'u1', code: 'A1', basePrice: 1, status: 'AVAILABLE', bedrooms: 2, area: 70, floor: 5, buildingId: 'tower_a' },
        0,
      ),
      unitToMapPin(
        { id: 'u2', code: 'A2', basePrice: 1, status: 'AVAILABLE', bedrooms: 2, area: 70, floor: 8, buildingId: 'tower_a' },
        1,
      ),
    ];
    const buildings = groupBuildingsFromPins(pins);
    expect(buildings).toHaveLength(1);
    expect(buildings[0]?.units).toBe(2);
  });
});
