export type MapPin = {
  unitId: string;
  code: string;
  label: string;
  lat: number;
  lng: number;
  basePrice: number;
  status: string;
  bedrooms: number;
  area: number;
  tower: string;
  floor: number;
  heightM: number;
};

export type MapBuilding = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  floors: number;
  units: number;
  maxHeightM: number;
};

export const PROJECT_CENTERS: Record<
  string,
  { lat: number; lng: number; label: string }
> = {
  proj_sunrise: { lat: 10.7769, lng: 106.7009, label: 'Sunrise Tower · Q2 HCMC' },
  default: { lat: 10.7769, lng: 106.7009, label: 'Sunrise Tower · Q2 HCMC' },
};

/** Geo placement from project center + floor/tower grid (production coords registry). */
export function unitToMapPin(
  input: {
    id: string;
    code: string;
    basePrice: number;
    status: string;
    bedrooms: number;
    area: number;
    floor: number | null;
    buildingId?: string | null;
    projectId?: string | null;
  },
  index: number,
): MapPin {
  const center = PROJECT_CENTERS[input.projectId ?? 'default'] ?? PROJECT_CENTERS.default;
  const tower = input.buildingId ?? 'tower_a';
  const towerOffset = tower.charCodeAt(tower.length - 1) % 5;
  const floor = input.floor ?? 1;
  return {
    unitId: input.id,
    code: input.code,
    label: `${input.code} · ${input.bedrooms}PN · F${floor}`,
    lat: center.lat + towerOffset * 0.0014 + (index % 4) * 0.0003,
    lng: center.lng + Math.floor(index / 4) * 0.0011 + floor * 0.00005,
    basePrice: Number(input.basePrice),
    status: input.status,
    bedrooms: input.bedrooms,
    area: Number(input.area),
    tower,
    floor,
    heightM: Math.max(12, floor * 3.2),
  };
}

export function groupBuildingsFromPins(pins: MapPin[]): MapBuilding[] {
  const map = new Map<string, MapBuilding>();
  for (const pin of pins) {
    const existing = map.get(pin.tower);
    if (!existing) {
      map.set(pin.tower, {
        id: pin.tower,
        label: pin.tower.replace(/_/g, ' ').toUpperCase(),
        lat: pin.lat,
        lng: pin.lng,
        floors: pin.floor,
        units: 1,
        maxHeightM: pin.heightM,
      });
    } else {
      existing.units += 1;
      existing.floors = Math.max(existing.floors, pin.floor);
      existing.maxHeightM = Math.max(existing.maxHeightM, pin.heightM);
    }
  }
  return [...map.values()];
}

export function mapCenterForProject(projectId?: string | null) {
  return PROJECT_CENTERS[projectId ?? 'default'] ?? PROJECT_CENTERS.default;
}
