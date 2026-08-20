import { Injectable } from '@nestjs/common';
import type { UnitEntity } from '../../database/entities/unit.entity';
import type { DriftInput, DriftReport, DriftFinding } from './anti-drift.types';

const PRICE_FLAG_RATIO = 0.05;
const PRICE_BLOCK_RATIO = 0.1;
const AREA_BLOCK_DELTA = 0.5;

@Injectable()
export class AntiDriftService {
  /** UC-GR-03 · S2-02 — compare listing marketing vs GR snapshot */
  evaluate(unit: UnitEntity, input: DriftInput): DriftReport {
    const findings: DriftFinding[] = [];
    let status: DriftReport['status'] = 'PASS';

    const bump = (next: DriftReport['status']) => {
      if (next === 'BLOCK') status = 'BLOCK';
      else if (next === 'FLAG' && status === 'PASS') status = 'FLAG';
    };

    if (input.priceDisplay !== undefined) {
      const base = Number(unit.basePrice);
      const ratio = Math.abs(input.priceDisplay - base) / base;
      if (ratio > PRICE_BLOCK_RATIO) {
        findings.push({
          field: 'priceDisplay',
          severity: 'BLOCK',
          message: `Giá marketing lệch >${PRICE_BLOCK_RATIO * 100}% so với GR`,
          grValue: base,
          listingValue: input.priceDisplay,
        });
        bump('BLOCK');
      } else if (ratio > PRICE_FLAG_RATIO) {
        findings.push({
          field: 'priceDisplay',
          severity: 'FLAG',
          message: `Giá marketing lệch >${PRICE_FLAG_RATIO * 100}% so với GR`,
          grValue: base,
          listingValue: input.priceDisplay,
        });
        bump('FLAG');
      }
    }

    if (input.areaDisplay !== undefined) {
      const grArea = Number(unit.area);
      const delta = Math.abs(input.areaDisplay - grArea);
      if (delta > AREA_BLOCK_DELTA) {
        findings.push({
          field: 'areaDisplay',
          severity: 'BLOCK',
          message: `Diện tích marketing lệch >${AREA_BLOCK_DELTA}m² so với GR`,
          grValue: grArea,
          listingValue: input.areaDisplay,
        });
        bump('BLOCK');
      }
    }

    if (unit.status !== 'AVAILABLE') {
      findings.push({
        field: 'unitStatus',
        severity: 'BLOCK',
        message: `Unit GR không AVAILABLE (${unit.status})`,
        grValue: unit.status,
      });
      bump('BLOCK');
    }

    return {
      status,
      findings,
      checkedAt: new Date().toISOString(),
    };
  }
}
