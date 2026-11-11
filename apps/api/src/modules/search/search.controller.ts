import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { oneLookedUpTenant } from '../../common/public-tenant-lookup';
import { requireHostTenant } from '../../common/resolve-tenant-from-host';
import { assertHeaderMatches } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { parseTransactionType } from './search-transaction-type.util';
import type { SearchSort } from './search.service';
import { NlSearchService } from './nl-search.service';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(
    private readonly search: SearchService,
    private readonly nlSearch: NlSearchService,
    private readonly dataSource: DataSource,
  ) {}

  private async publicTenant(
    header: string | undefined,
    host: string | undefined,
    resource?: { kind: 'unit' | 'project'; id: string },
  ): Promise<string> {
    const tenantId = resource?.id
      ? await oneLookedUpTenant(this.dataSource, resource.kind, resource.id, 'not-found')
      : requireHostTenant(host);
    assertHeaderMatches(header, tenantId);
    return tenantId;
  }

  /** P1 FR-AI-001 — Vietnamese NL → structured filters */
  @Public()
  @Post('nl')
  @HttpCode(200)
  async parseNl(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('host') host: string | undefined,
    @Body() body: { query: string },
  ) {
    const parsed = this.nlSearch.parse(body.query ?? '');
    return {
      data: parsed,
      meta: { tenantId: await this.publicTenant(tenantHeader, host), grounded: true },
    };
  }

  /** Phase A — NL eval gate (FR-AI-001 / BA-06) */
  @Public()
  @Get('nl/eval')
  nlEval() {
    const result = this.nlSearch.runEvalSet();
    return {
      data: result,
      meta: {
        evalSet: 'NNHN-AI-EVAL-VN-50',
        gatePassed: result.gatePassed,
        minPassRate: result.minPassRate,
      },
    };
  }

  /** API-039 GET /search/units — UC-LS-01 public search (guest) */
  @Public()
  @Get('units')
  async searchUnits(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('host') host: string | undefined,
    @Query('q') q?: string,
    @Query('district') district?: string,
    @Query('city') city?: string,
    @Query('bedrooms') bedroomsRaw?: string,
    @Query('minPrice') minPriceRaw?: string,
    @Query('maxPrice') maxPriceRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('transactionType') transactionTypeRaw?: string,
    @Query('sort') sortRaw?: string,
  ) {
    const parseNum = (v?: string) => {
      if (!v) return undefined;
      const n = Number.parseInt(v, 10);
      return Number.isFinite(n) ? n : undefined;
    };

    const sortValues: SearchSort[] = ['relevance', 'newest', 'price', 'area', 'verified_first'];
    const sort = sortValues.includes(sortRaw as SearchSort) ? (sortRaw as SearchSort) : undefined;

    return this.search.searchUnits({
      tenantId: await this.publicTenant(tenantHeader, host),
      q,
      district,
      city,
      bedrooms: parseNum(bedroomsRaw),
      minPrice: parseNum(minPriceRaw),
      maxPrice: parseNum(maxPriceRaw),
      limit: parseNum(limitRaw),
      transactionType: parseTransactionType(transactionTypeRaw),
      sort,
    });
  }

  /** UC-LS-07 index health — ops / integration test */
  @Public()
  @Get('index/status')
  async indexStatus(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('host') host: string | undefined,
  ) {
    return this.search.indexStatus(await this.publicTenant(tenantHeader, host));
  }

  /** P1 — verified listing counts for public trust strip */
  @Public()
  @Get('stats')
  async searchStats(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('host') host: string | undefined,
  ) {
    return this.search.searchStats(await this.publicTenant(tenantHeader, host));
  }

  /** Phase A FR-SRCH-007 — map pins; bbox = search-on-move */
  @Public()
  @Get('map')
  async searchMap(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('host') host: string | undefined,
    @Query('projectId') projectId?: string,
    @Query('north') northRaw?: string,
    @Query('south') southRaw?: string,
    @Query('east') eastRaw?: string,
    @Query('west') westRaw?: string,
  ) {
    const parseCoord = (v?: string) => {
      if (!v) return undefined;
      const n = Number.parseFloat(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const north = parseCoord(northRaw);
    const south = parseCoord(southRaw);
    const east = parseCoord(eastRaw);
    const west = parseCoord(westRaw);
    const bbox =
      north !== undefined && south !== undefined && east !== undefined && west !== undefined
        ? { north, south, east, west }
        : undefined;

    const id = projectId?.trim();
    return this.search.getMapFromIndex(
      await this.publicTenant(tenantHeader, host, id ? { kind: 'project', id } : undefined),
      id,
      bbox,
    );
  }

  /** P2 — developer project page aggregate */
  @Public()
  @Get('projects/:projectId')
  async getProjectDetail(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.search.getProjectDetail(
      await this.publicTenant(tenantHeader, undefined, { kind: 'project', id: projectId }),
      projectId,
    );
  }

  /** P2 — unit listing gallery */
  @Public()
  @Get('units/:unitId/media')
  async getUnitMedia(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('unitId') unitId: string,
  ) {
    return this.search.getUnitMedia(
      await this.publicTenant(tenantHeader, undefined, { kind: 'unit', id: unitId }),
      unitId,
    );
  }

  /** UC-AI-06 · SCR-PUBLIC-003 buyer-product matching */
  @Public()
  @Get('recommendations')
  async recommendUnits(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('host') host: string | undefined,
    @Query('seedUnitId') seedUnitId?: string,
    @Query('bedrooms') bedroomsRaw?: string,
    @Query('minPrice') minPriceRaw?: string,
    @Query('maxPrice') maxPriceRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const parseNum = (v?: string) => {
      if (!v) return undefined;
      const n = Number.parseInt(v, 10);
      return Number.isFinite(n) ? n : undefined;
    };

    const seed = seedUnitId?.trim();
    return this.search.recommendUnits({
      tenantId: await this.publicTenant(
        tenantHeader,
        host,
        seed ? { kind: 'unit', id: seed } : undefined,
      ),
      seedUnitId: seed,
      bedrooms: parseNum(bedroomsRaw),
      minPrice: parseNum(minPriceRaw),
      maxPrice: parseNum(maxPriceRaw),
      limit: parseNum(limitRaw),
    });
  }

  /** API-040 GET /search/units/{unitId} — UC-LS-05 · SCR-PUBLIC-006 */
  @Public()
  @Get('units/:unitId')
  async getUnitDetail(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('unitId') unitId: string,
  ) {
    return this.search.getUnitDetail(
      await this.publicTenant(tenantHeader, undefined, { kind: 'unit', id: unitId }),
      unitId,
    );
  }
}
