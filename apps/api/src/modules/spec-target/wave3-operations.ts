/** Throwaway-drill rules. Unsigned targets stay unmeasured and never become a go / hold / stop call. */

export type SandboxRails = {
  vnpaySandbox: boolean;
  mfaSandbox: boolean;
  smsSandbox: boolean;
};

export function sandboxFlowWhenDisabled(
  rails: SandboxRails,
): { running: false; status: 'NOT_PAID' } | { running: true } {
  if (rails.vnpaySandbox || rails.mfaSandbox || rails.smsSandbox) return { running: true };
  return { running: false, status: 'NOT_PAID' };
}

const PII_FIELDS = ['phone', 'email', 'nationalId', 'fullName', 'address'] as const;

export function reviewPilotChecklist(input: {
  accountClass: string;
  fields: Record<string, unknown>;
  collectsMoney: boolean;
  pilotFlag: boolean;
}): { ok: true; accountClass: 'SYNTHETIC' } | { ok: false; reason: string } {
  if (input.accountClass !== 'SYNTHETIC') return { ok: false, reason: 'real account is not allowed' };
  if (input.collectsMoney) return { ok: false, reason: 'collecting money is not allowed' };
  if (input.pilotFlag) return { ok: false, reason: 'pilot flag is not signed' };
  for (const key of PII_FIELDS) {
    const value = input.fields[key];
    if (typeof value === 'string' && value.trim()) {
      return { ok: false, reason: 'pii is not allowed on the synthetic drill' };
    }
  }
  return { ok: true, accountClass: 'SYNTHETIC' };
}

export type KpiCell = { measured: false } | { measured: true; value: number };

export type DrillKpiInput = {
  freshSourceCount: number | null;
  projectionLagMs: number | null;
  staleCtaCount: number | null;
  doubleHoldCount: number | null;
  leadCount: number | null;
  viewingCount: number | null;
  holdCount: number | null;
  reconciledDepositCount: number | null;
  contractCount: number | null;
  slaBusinessHours: number | null;
  disputeCount: number | null;
  noShowCount: number | null;
  unmatchedDocumentCount: number | null;
  reconciliationMinutes: number | null;
  pendingRefundCount: number | null;
  earnedAging: number | null;
  payableAging: number | null;
  paidAging: number | null;
  usefulTaskCount: number | null;
  exceptionMinutes: number | null;
  citationCount: number | null;
  aiCostVnd: number | null;
};

function cell(value: number | null): KpiCell {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { measured: false };
  return { measured: true, value };
}

const EMPTY_DRILL: DrillKpiInput = {
  freshSourceCount: null,
  projectionLagMs: null,
  staleCtaCount: null,
  doubleHoldCount: null,
  leadCount: null,
  viewingCount: null,
  holdCount: null,
  reconciledDepositCount: null,
  contractCount: null,
  slaBusinessHours: null,
  disputeCount: null,
  noShowCount: null,
  unmatchedDocumentCount: null,
  reconciliationMinutes: null,
  pendingRefundCount: null,
  earnedAging: null,
  payableAging: null,
  paidAging: null,
  usefulTaskCount: null,
  exceptionMinutes: null,
  citationCount: null,
  aiCostVnd: null,
};

export function measureDrillKpis(input: DrillKpiInput | null): {
  KP01: {
    freshSourceCount: KpiCell;
    projectionLagMs: KpiCell;
    staleCtaCount: KpiCell;
    doubleHoldCount: KpiCell;
  };
  KP02: {
    leadCount: KpiCell;
    viewingCount: KpiCell;
    holdCount: KpiCell;
    reconciledDepositCount: KpiCell;
    contractCount: KpiCell;
    slaBusinessHours: KpiCell;
    disputeCount: KpiCell;
    noShowCount: KpiCell;
  };
  KP03: {
    unmatchedDocumentCount: KpiCell;
    reconciliationMinutes: KpiCell;
    pendingRefundCount: KpiCell;
    earnedAging: KpiCell;
    payableAging: KpiCell;
    paidAging: KpiCell;
  };
  KP04: {
    usefulTaskCount: KpiCell;
    exceptionMinutes: KpiCell;
    citationCount: KpiCell;
    aiCostVnd: KpiCell;
  };
  recommendation: 'none';
} {
  const source = input ?? EMPTY_DRILL;
  return {
    KP01: {
      freshSourceCount: cell(source.freshSourceCount),
      projectionLagMs: cell(source.projectionLagMs),
      staleCtaCount: cell(source.staleCtaCount),
      doubleHoldCount: cell(source.doubleHoldCount),
    },
    KP02: {
      leadCount: cell(source.leadCount),
      viewingCount: cell(source.viewingCount),
      holdCount: cell(source.holdCount),
      reconciledDepositCount: cell(source.reconciledDepositCount),
      contractCount: cell(source.contractCount),
      slaBusinessHours: cell(source.slaBusinessHours),
      disputeCount: cell(source.disputeCount),
      noShowCount: cell(source.noShowCount),
    },
    KP03: {
      unmatchedDocumentCount: cell(source.unmatchedDocumentCount),
      reconciliationMinutes: cell(source.reconciliationMinutes),
      pendingRefundCount: cell(source.pendingRefundCount),
      earnedAging: cell(source.earnedAging),
      payableAging: cell(source.payableAging),
      paidAging: cell(source.paidAging),
    },
    KP04: {
      usefulTaskCount: cell(source.usefulTaskCount),
      exceptionMinutes: cell(source.exceptionMinutes),
      citationCount: cell(source.citationCount),
      aiCostVnd: cell(source.aiCostVnd),
    },
    recommendation: 'none',
  };
}
