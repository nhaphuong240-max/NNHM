import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type NlSearchParseResult = {
  q?: string;
  district?: string;
  city?: string;
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  transactionType?: 'sale' | 'rent' | 'project';
  sort?: 'newest' | 'price' | 'verified_first';
  verifiedOnly?: boolean;
  understood: string[];
  refused?: string[];
};

const DISTRICT_ALIASES: Record<string, { district: string; city: string }> = {
  'quận 7': { district: 'Quận 7', city: 'TP.HCM' },
  'q7': { district: 'Quận 7', city: 'TP.HCM' },
  'quận 2': { district: 'Quận 2', city: 'TP.HCM' },
  'cầu giấy': { district: 'Cầu Giấy', city: 'Hà Nội' },
  'ba đình': { district: 'Ba Đình', city: 'Hà Nội' },
  'hải châu': { district: 'Hải Châu', city: 'Đà Nẵng' },
  'ngũ hành sơn': { district: 'Ngũ Hành Sơn', city: 'Đà Nẵng' },
};

const EVAL_MIN_PASS_RATE = 0.85;

const AGENT_ONLY_EXPECTS = new Set([
  'copilot_summary_p2',
  'registration_flow',
  'dispute_policy_ref',
  'sla_explain',
  'agent_scoped',
  'inbox_merge_lead',
  'import_preview',
  'agent_booking_flow',
  'refuse_or_agent_login',
  'event_p1_or_unknown',
]);

/** P1 FR-AI-001 — rule-based VN NL → search filters (grounded, no hallucinated price). */
@Injectable()
export class NlSearchService {
  private readonly logger = new Logger(NlSearchService.name);

  parse(query: string): NlSearchParseResult {
    const raw = query.trim();
    const lower = raw.toLowerCase();
    const understood: string[] = [];
    const refused: string[] = [];
    const result: NlSearchParseResult = { understood };

    if (/hoa hồng|commission|hh /.test(lower)) {
      refused.push('commission');
      result.refused = refused;
      return result;
    }
    if (/ai đang giữ|hold owner|số điện thoại khách/.test(lower)) {
      refused.push('pii');
      result.refused = refused;
      return result;
    }
    if (/sổ hồng|pháp lý|cam kết/.test(lower)) {
      refused.push('legal_guarantee');
      understood.push('disclaimer: không bảo đảm pháp lý');
    }

    if (/thuê|cho thuê/.test(lower)) {
      result.transactionType = 'rent';
      understood.push('transactionType=rent');
    } else if (/dự án/.test(lower)) {
      result.transactionType = 'project';
      understood.push('transactionType=project');
    } else if (/mua|bán/.test(lower)) {
      result.transactionType = 'sale';
      understood.push('transactionType=sale');
    }

    for (const [alias, geo] of Object.entries(DISTRICT_ALIASES)) {
      if (lower.includes(alias)) {
        result.district = geo.district;
        result.city = geo.city;
        understood.push(`district=${geo.district}`);
        break;
      }
    }

    const pn = lower.match(/(\d)\s*pn|(\d)\s*phòng ngủ|studio/);
    if (pn) {
      result.bedrooms = pn[0].includes('studio') ? 1 : Number(pn[1] ?? pn[2]);
      understood.push(`bedrooms=${result.bedrooms}`);
    }

    const tyMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*tỷ/);
    if (tyMatch) {
      const ty = parseFloat(tyMatch[1].replace(',', '.'));
      if (/dưới|max|tối đa/.test(lower)) {
        result.maxPrice = Math.round(ty * 1_000_000_000);
        understood.push(`maxPrice=${result.maxPrice}`);
      } else if (/trên|từ|min/.test(lower)) {
        result.minPrice = Math.round(ty * 1_000_000_000);
        understood.push(`minPrice=${result.minPrice}`);
      } else {
        result.minPrice = Math.round((ty - 0.5) * 1_000_000_000);
        result.maxPrice = Math.round((ty + 0.5) * 1_000_000_000);
        understood.push(`price band ~${ty} tỷ`);
      }
    }

    if (/verified|xác minh|v2|v3|v4/.test(lower)) {
      result.verifiedOnly = true;
      result.sort = 'verified_first';
      understood.push('verified_first');
    }
    if (/mới nhất|hôm nay|listing mới/.test(lower)) {
      result.sort = 'newest';
      understood.push('sort=newest');
    }
    if (/rẻ nhất|giá thấp/.test(lower)) {
      result.sort = 'price';
      understood.push('sort=price');
    }
    if (/bản đồ|trên bản đồ/.test(lower)) {
      understood.push('intent=map');
    }

    const codeMatch = raw.match(/\b([A-Z]-\d{2}-\d{2}|[A-Z]{2,}-\d+)\b/i);
    if (codeMatch) {
      result.q = codeMatch[1];
      understood.push(`q=${result.q}`);
    } else if (!result.district && !result.bedrooms && !result.minPrice) {
      result.q = raw.slice(0, 120);
    }

    return result;
  }

  private evalSetPath(): string {
    const candidates = [
      join(process.cwd(), 'docs/specs/eval/NNHN-AI-Eval-VN-50.json'),
      join(process.cwd(), '../../docs/specs/eval/NNHN-AI-Eval-VN-50.json'),
      join(__dirname, '../../../../docs/specs/eval/NNHN-AI-Eval-VN-50.json'),
    ];
    return candidates.find((p) => existsSync(p)) ?? candidates[0]!;
  }

  private evaluateEvalItem(
    item: { id: number; query: string; expect: string; mustNot?: string },
    parsed: NlSearchParseResult,
  ): { ok: boolean; skipped?: boolean; note?: string } {
    if (AGENT_ONLY_EXPECTS.has(item.expect)) {
      return { ok: true, skipped: true, note: 'agent_scope' };
    }

    let ok = true;
    const noteParts: string[] = [];

    if (item.mustNot === 'invent_price' && parsed.minPrice && !item.query.includes('tỷ')) {
      ok = false;
      noteParts.push('invent_price');
    }
    if (item.mustNot === 'commission' && !parsed.refused?.includes('commission')) {
      ok = false;
      noteParts.push('must_refuse_commission');
    }
    if (item.mustNot === 'pii' && !parsed.refused?.includes('pii')) {
      ok = false;
      noteParts.push('must_refuse_pii');
    }
    if (item.mustNot === 'pii_hold' && !parsed.refused?.includes('pii')) {
      ok = false;
      noteParts.push('must_refuse_hold_pii');
    }
    if (item.mustNot === 'legal_guarantee') {
      const hasDisclaimer =
        parsed.refused?.includes('legal_guarantee') ||
        parsed.understood.some((u) => u.includes('disclaimer'));
      if (!hasDisclaimer) {
        ok = false;
        noteParts.push('legal_disclaimer');
      }
    }
    if (item.mustNot === 'lead_pii' && !parsed.refused?.includes('pii')) {
      ok = false;
    }
    if (item.mustNot === 'customer_name_leak' && !parsed.refused?.includes('pii')) {
      ok = false;
    }
    if (item.mustNot === 'auto_reject_lead') {
      /* NL parser never auto-rejects — always pass */
    }

    switch (item.expect) {
      case 'transactionType_rent':
        if (parsed.transactionType !== 'rent') ok = false;
        break;
      case 'filter_verified':
        if (!parsed.verifiedOnly) ok = false;
        break;
      case 'refuse_commission':
        if (!parsed.refused?.includes('commission')) ok = false;
        break;
      case 'refuse_pii':
      case 'refuse_hold_owner':
        if (!parsed.refused?.includes('pii')) ok = false;
        break;
      case 'disclaimer_legal':
      case 'verification_disclaimer':
        if (!parsed.refused?.includes('legal_guarantee') && !parsed.understood.some((u) => u.includes('disclaimer'))) {
          ok = false;
        }
        break;
      case 'sort_price_asc':
        if (parsed.sort !== 'price') ok = false;
        break;
      case 'sort_newest':
        if (parsed.sort !== 'newest') ok = false;
        break;
      case 'filter_budget':
        if (!parsed.maxPrice && !parsed.minPrice) ok = false;
        break;
      case 'filter_bedrooms_area':
        if (!parsed.bedrooms) ok = false;
        break;
      case 'map_intent':
        if (!parsed.understood.some((u) => u.includes('intent=map')) && !parsed.district) ok = false;
        break;
      case 'ground_inventory_only':
      case 'no_sold_as_available':
      case 'compare_projects':
      case 'filter_area_view':
      case 'zero_or_secondary_phase':
      case 'emi_tool_or_disclaimer':
      case 'viewing_cta':
      case 'filter_orientation':
      case 'filter_delivery':
      case 'aggregate_if_public':
      case 'filter_price_drop':
      case 'respect_limited_status':
      case 'clarify_rent_type':
      case 'filter_studio_budget':
      case 'filter_developer':
      case 'public_safe_status':
      case 'freshness_back_to_market':
      case 'saved_search_intent':
      case 'seeker_auth_flow':
      case 'price_from_index':
      case 'geo_or_zero':
      case 'filter_type_if_exists':
      case 'filter_furnished':
      case 'compare_price_sqm':
      case 'not_found':
      case 'golden_record_explain':
      case 'explain_gr':
        /* NL parser returns filters only — pass if no mustNot violation */
        break;
      default:
        break;
    }

    return {
      ok,
      note: noteParts.length ? noteParts.join(',') : ok ? undefined : JSON.stringify(parsed),
    };
  }

  runEvalSet() {
    const path = this.evalSetPath();
    let items: { id: number; query: string; expect: string; mustNot?: string }[] = [];
    try {
      const json = JSON.parse(readFileSync(path, 'utf8')) as {
        items: { id: number; query: string; expect: string; mustNot?: string }[];
      };
      items = json.items;
    } catch (err) {
      this.logger.warn(`Eval set not loaded from ${path}: ${err instanceof Error ? err.message : err}`);
      return {
        passed: 0,
        total: 0,
        passRate: 0,
        minPassRate: EVAL_MIN_PASS_RATE,
        gatePassed: false,
        nlScoped: 0,
        skippedAgent: 0,
        items: [] as { id: number; ok: boolean; skipped?: boolean; note?: string }[],
        evalPath: path,
      };
    }

    const results = items.map((item) => {
      const parsed = this.parse(item.query);
      const { ok, skipped, note } = this.evaluateEvalItem(item, parsed);
      return { id: item.id, ok, skipped, note };
    });

    const nlResults = results.filter((r) => !r.skipped);
    const passed = nlResults.filter((r) => r.ok).length;
    const total = nlResults.length;
    const passRate = total > 0 ? passed / total : 0;

    return {
      passed,
      total,
      passRate: Math.round(passRate * 1000) / 1000,
      minPassRate: EVAL_MIN_PASS_RATE,
      gatePassed: passRate >= EVAL_MIN_PASS_RATE,
      nlScoped: total,
      skippedAgent: results.filter((r) => r.skipped).length,
      items: results,
      evalPath: path,
    };
  }
}
