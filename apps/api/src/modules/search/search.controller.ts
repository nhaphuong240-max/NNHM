import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
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
    private readonly config: ConfigService,
  ) {}

  /** P1 FR-AI-001 — Vietnamese NL → structured filters */
  @Public()
  @Post('nl')
  @HttpCode(200)
  parseNl(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { query: string },
  ) {
    const parsed = this.nlSearch.parse(body.query ?? '');
    return {
      data: parsed,
      meta: { tenantId: resolveTenantId(this.config, undefined, tenantHeader), grounded: true },
    };
  }

  @Get('nl/eval')
  nlEval() {
    return { data: this.nlSearch.runEvalSet(), meta: { evalSet: 'NNHN-AI-EVAL-VN-50' } };
  }

  /** API-039 GET /search/units — UC-LS-01 public search (guest) */
  @Public()
  @Get('units')
  searchUnits(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
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
      tenantId: resolveTenantId(this.config, undefined, tenantHeader),
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
  indexStatus(@Headers('x-tenant-id') tenantHeader: string | undefined) {
    return this.search.indexStatus(resolveTenantId(this.config, undefined, tenantHeader));
  }

  /** P1 — verified listing counts for public trust strip */
  @Public()
  @Get('stats')
  searchStats(@Headers('x-tenant-id') tenantHeader: string | undefined) {
    return this.search.searchStats(resolveTenantId(this.config, undefined, tenantHeader));
  }

  /** P2 — map pins from search index listings */
  @Public()
  @Get('map')
  searchMap(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('projectId') projectId?: string,
  ) {
    return this.search.getMapFromIndex(
      resolveTenantId(this.config, undefined, tenantHeader),
      projectId,
    );
  }

  /** P2 — developer project page aggregate */
  @Public()
  @Get('projects/:projectId')
  getProjectDetail(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.search.getProjectDetail(
      resolveTenantId(this.config, undefined, tenantHeader),
      projectId,
    );
  }

  /** P2 — unit listing gallery */
  @Public()
  @Get('units/:unitId/media')
  getUnitMedia(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('unitId') unitId: string,
  ) {
    return this.search.getUnitMedia(
      resolveTenantId(this.config, undefined, tenantHeader),
      unitId,
    );
  }

  /** UC-AI-06 · SCR-PUBLIC-003 buyer-product matching */
  @Public()
  @Get('recommendations')
  recommendUnits(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
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

    return this.search.recommendUnits({
      tenantId: resolveTenantId(this.config, undefined, tenantHeader),
      seedUnitId: seedUnitId?.trim() || undefined,
      bedrooms: parseNum(bedroomsRaw),
      minPrice: parseNum(minPriceRaw),
      maxPrice: parseNum(maxPriceRaw),
      limit: parseNum(limitRaw),
    });
  }

  /** API-040 GET /search/units/{unitId} — UC-LS-05 · SCR-PUBLIC-006 */
  @Public()
  @Get('units/:unitId')
  getUnitDetail(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('unitId') unitId: string,
  ) {
    return this.search.getUnitDetail(
      resolveTenantId(this.config, undefined, tenantHeader),
      unitId,
    );
  }
}
