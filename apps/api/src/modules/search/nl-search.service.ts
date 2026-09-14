import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
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

/** P1 FR-AI-001 — rule-based VN NL → search filters (grounded, no hallucinated price). */
@Injectable()
export class NlSearchService {
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

  runEvalSet(): { passed: number; total: number; items: { id: number; ok: boolean; note?: string }[] } {
    const path = join(process.cwd(), 'docs/specs/eval/NNHN-AI-Eval-VN-50.json');
    let items: { id: number; query: string; expect: string; mustNot?: string }[] = [];
    try {
      const json = JSON.parse(readFileSync(path, 'utf8')) as {
        items: { id: number; query: string; expect: string; mustNot?: string }[];
      };
      items = json.items;
    } catch {
      return { passed: 0, total: 0, items: [] };
    }

    const results = items.map((item) => {
      const parsed = this.parse(item.query);
      let ok = true;
      let note: string | undefined;
      if (item.mustNot === 'invent_price' && parsed.minPrice && !item.query.includes('tỷ')) ok = false;
      if (item.mustNot === 'commission' && !parsed.refused?.includes('commission')) ok = false;
      if (item.mustNot === 'pii' && !parsed.refused?.includes('pii')) ok = false;
      if (item.mustNot === 'legal_guarantee' && !parsed.refused?.includes('legal_guarantee')) ok = false;
      if (item.expect === 'transactionType_rent' && parsed.transactionType !== 'rent') ok = false;
      if (item.expect === 'filter_verified' && !parsed.verifiedOnly) ok = false;
      if (item.expect === 'refuse_commission' && !parsed.refused?.includes('commission')) ok = false;
      if (item.expect === 'refuse_pii' && !parsed.refused?.includes('pii')) ok = false;
      if (!ok) note = JSON.stringify(parsed);
      return { id: item.id, ok, note };
    });

    return {
      passed: results.filter((r) => r.ok).length,
      total: results.length,
      items: results,
    };
  }
}
