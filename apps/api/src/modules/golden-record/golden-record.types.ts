import type { ProjectEntity } from '../../database/entities/project.entity';
import type { UnitEntity } from '../../database/entities/unit.entity';

export interface ProjectAttributes {
  code: string;
  name: string;
  city: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  unitCount: number;
  createdAt: string;
}

export interface ProjectApiRow {
  id: string;
  attributes: ProjectAttributes;
}

export interface CreateProjectInput {
  code: string;
  name: string;
  city?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateProjectInput {
  code?: string;
  name?: string;
  city?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function mapProjectToApiRow(project: ProjectEntity, unitCount = 0): ProjectApiRow {
  return {
    id: project.id,
    attributes: {
      code: project.code,
      name: project.name,
      city: project.city,
      district: project.district,
      latitude: project.latitude != null ? Number(project.latitude) : null,
      longitude: project.longitude != null ? Number(project.longitude) : null,
      unitCount,
      createdAt: project.createdAt.toISOString(),
    },
  };
}

export interface UnitAttributes {
  code: string;
  status: UnitEntity['status'];
  basePrice: number;
  area: number;
  bedrooms: number;
  floor: number | null;
  version: number;
  projectId: string;
  updatedAt: string;
}

export interface UnitApiRow {
  id: string;
  attributes: UnitAttributes;
}

export interface ListUnitsQuery {
  tenantId: string;
  projectId?: string;
  status?: UnitEntity['status'];
  limit?: number;
}

export interface ListUnitsResult {
  data: UnitApiRow[];
  meta: {
    count: number;
    tenantId: string;
    projectId?: string;
    source: 'postgres';
  };
}

export interface PatchUnitInput {
  basePrice?: number;
  status?: UnitEntity['status'];
  reason?: string;
  expectedVersion: number;
}

export interface UnitImportPreviewInput {
  projectId: string;
  csvText: string;
  columnMap?: Partial<
    Record<'code' | 'floor' | 'area' | 'bedrooms' | 'basePrice' | 'status', string>
  >;
}

export interface UnitImportCommitRow {
  code: string;
  floor: number | null;
  area: number;
  bedrooms: number;
  basePrice: number;
  status: UnitEntity['status'];
  diffAction: 'CREATE' | 'UPDATE';
}

export interface UnitImportCommitInput {
  projectId: string;
  rows: UnitImportCommitRow[];
  reason?: string;
}

export function mapUnitToApiRow(unit: UnitEntity): UnitApiRow {
  return {
    id: unit.id,
    attributes: {
      code: unit.code,
      status: unit.status,
      basePrice: Number(unit.basePrice),
      area: Number(unit.area),
      bedrooms: unit.bedrooms,
      floor: unit.floor,
      version: unit.version,
      projectId: unit.projectId,
      updatedAt: unit.updatedAt.toISOString(),
    },
  };
}

export interface ProductGraphFilters {
  building?: string;
  status?: UnitEntity['status'];
  minPrice?: number;
  maxPrice?: number;
}

export interface ProductGraphKpi {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  hold: number;
  absorptionRate: number;
}

export interface ProductGraphUnitNode {
  id: string;
  code: string;
  status: UnitEntity['status'];
  basePrice: number;
  area: number;
  bedrooms: number;
  floor: number;
}

export interface ProductGraphFloorNode {
  id: string;
  floor: number;
  label: string;
  stats: ProductGraphKpi;
  units: ProductGraphUnitNode[];
}

export interface ProductGraphBuildingNode {
  id: string;
  code: string;
  label: string;
  stats: ProductGraphKpi;
  absorptionRate: number;
  floors: ProductGraphFloorNode[];
}

export interface ProductGraphNode {
  id: string;
  type: 'project' | 'building' | 'floor' | 'unit';
  label: string;
  parentId?: string;
  meta?: Record<string, unknown>;
}

export interface ProductGraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface ProductGraphResult {
  project: {
    id: string;
    code: string;
    name: string;
    stats: ProductGraphKpi;
  };
  buildings: ProductGraphBuildingNode[];
  nodes: ProductGraphNode[];
  edges: ProductGraphEdge[];
}

export function parseBuildingCode(unitCode: string): string {
  return unitCode.split('-')[0]?.trim() || unitCode;
}

function computeKpi(units: UnitEntity[]): ProductGraphKpi {
  const total = units.length;
  const available = units.filter((u) => u.status === 'AVAILABLE').length;
  const reserved = units.filter((u) => u.status === 'RESERVED').length;
  const sold = units.filter((u) => u.status === 'SOLD').length;
  const hold = units.filter((u) => u.status === 'HOLD').length;
  const absorptionRate = total > 0 ? Math.round((sold / total) * 1000) / 1000 : 0;
  return { total, available, reserved, sold, hold, absorptionRate };
}

/** UC-GR-04 — derive Project → Building → Floor → Unit tree from flat GR rows */
export function buildProductGraph(
  project: { id: string; code: string; name: string },
  units: UnitEntity[],
): ProductGraphResult {
  const buildingMap = new Map<string, UnitEntity[]>();

  for (const unit of units) {
    const building = parseBuildingCode(unit.code);
    const list = buildingMap.get(building) ?? [];
    list.push(unit);
    buildingMap.set(building, list);
  }

  const buildings: ProductGraphBuildingNode[] = [...buildingMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, buildingUnits]) => {
      const floorMap = new Map<number, UnitEntity[]>();
      for (const unit of buildingUnits) {
        const floor =
          unit.floor ?? (Number.parseInt(unit.code.split('-')[1] ?? '0', 10) || 0);
        const list = floorMap.get(floor) ?? [];
        list.push(unit);
        floorMap.set(floor, list);
      }

      const floors: ProductGraphFloorNode[] = [...floorMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([floor, floorUnits]) => {
          const sortedUnits = [...floorUnits].sort((a, b) => a.code.localeCompare(b.code));
          return {
            id: `floor:${code}:${floor}`,
            floor,
            label: `Tầng ${floor}`,
            stats: computeKpi(sortedUnits),
            units: sortedUnits.map((u) => ({
              id: u.id,
              code: u.code,
              status: u.status,
              basePrice: Number(u.basePrice),
              area: Number(u.area),
              bedrooms: u.bedrooms,
              floor: u.floor ?? floor,
            })),
          };
        });

      const stats = computeKpi(buildingUnits);
      return {
        id: `building:${code}`,
        code,
        label: `Block ${code}`,
        stats,
        absorptionRate: stats.absorptionRate,
        floors,
      };
    });

  const nodes: ProductGraphNode[] = [
    {
      id: `project:${project.id}`,
      type: 'project',
      label: project.name,
      meta: { code: project.code, stats: computeKpi(units) },
    },
  ];
  const edges: ProductGraphEdge[] = [];

  for (const building of buildings) {
    nodes.push({
      id: building.id,
      type: 'building',
      label: building.label,
      parentId: `project:${project.id}`,
      meta: { stats: building.stats, absorptionRate: building.absorptionRate },
    });
    edges.push({
      id: `${project.id}->${building.id}`,
      source: `project:${project.id}`,
      target: building.id,
    });

    for (const floor of building.floors) {
      nodes.push({
        id: floor.id,
        type: 'floor',
        label: floor.label,
        parentId: building.id,
        meta: { stats: floor.stats, floor: floor.floor },
      });
      edges.push({ id: `${building.id}->${floor.id}`, source: building.id, target: floor.id });

      for (const unit of floor.units) {
        nodes.push({
          id: unit.id,
          type: 'unit',
          label: unit.code,
          parentId: floor.id,
          meta: {
            status: unit.status,
            basePrice: unit.basePrice,
            area: unit.area,
            bedrooms: unit.bedrooms,
          },
        });
        edges.push({ id: `${floor.id}->${unit.id}`, source: floor.id, target: unit.id });
      }
    }
  }

  return {
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      stats: computeKpi(units),
    },
    buildings,
    nodes,
    edges,
  };
}
