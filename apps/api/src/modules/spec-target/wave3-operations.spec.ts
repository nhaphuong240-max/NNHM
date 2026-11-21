import { measureDrillKpis, reviewPilotChecklist, sandboxFlowWhenDisabled, type DrillKpiInput } from './wave3-operations';

describe('wave 3 operations', () => {
  it('stops the sandbox flow without recording PAID when every demo rail is off', () => {
    expect(
      sandboxFlowWhenDisabled({ vnpaySandbox: false, mfaSandbox: false, smsSandbox: false }),
    ).toEqual({ running: false, status: 'NOT_PAID' });
  });

  it('keeps the sandbox flow unmarked while a demo rail stays on', () => {
    expect(
      sandboxFlowWhenDisabled({ vnpaySandbox: false, mfaSandbox: true, smsSandbox: false }),
    ).toEqual({ running: true });
  });

  it('accepts one synthetic project and rejects a real account, pii, money, or the pilot flag', () => {
    expect(
      reviewPilotChecklist({
        accountClass: 'SYNTHETIC',
        fields: {},
        collectsMoney: false,
        pilotFlag: false,
      }),
    ).toEqual({ ok: true, accountClass: 'SYNTHETIC' });
    expect(
      reviewPilotChecklist({
        accountClass: 'LIVE',
        fields: {},
        collectsMoney: false,
        pilotFlag: false,
      }),
    ).toEqual({ ok: false, reason: 'real account is not allowed' });
    expect(
      reviewPilotChecklist({
        accountClass: 'SYNTHETIC',
        fields: { phone: 'not-a-real-number' },
        collectsMoney: false,
        pilotFlag: false,
      }),
    ).toEqual({ ok: false, reason: 'pii is not allowed on the synthetic drill' });
    expect(
      reviewPilotChecklist({
        accountClass: 'SYNTHETIC',
        fields: {},
        collectsMoney: true,
        pilotFlag: false,
      }),
    ).toEqual({ ok: false, reason: 'collecting money is not allowed' });
    expect(
      reviewPilotChecklist({
        accountClass: 'SYNTHETIC',
        fields: {},
        collectsMoney: false,
        pilotFlag: true,
      }),
    ).toEqual({ ok: false, reason: 'pilot flag is not signed' });
  });

  it('leaves an empty drill unmeasured and does not recommend expand, hold, or stop', () => {
    const result = measureDrillKpis(null);
    expect(result.KP01.doubleHoldCount).toEqual({ measured: false });
    expect(result.KP02.leadCount).toEqual({ measured: false });
    expect(result.KP03.paidAging).toEqual({ measured: false });
    expect(result.KP04.aiCostVnd).toEqual({ measured: false });
    expect(result.recommendation).toBe('none');
  });

  it('keeps the recommendation empty when every drill cell has a count', () => {
    const filled: DrillKpiInput = {
      freshSourceCount: 1,
      projectionLagMs: 0,
      staleCtaCount: 0,
      doubleHoldCount: 0,
      leadCount: 0,
      viewingCount: 0,
      holdCount: 0,
      reconciledDepositCount: 0,
      contractCount: 0,
      slaBusinessHours: 0,
      disputeCount: 0,
      noShowCount: 0,
      unmatchedDocumentCount: 0,
      reconciliationMinutes: 0,
      pendingRefundCount: 0,
      earnedAging: 0,
      payableAging: 0,
      paidAging: 0,
      usefulTaskCount: 0,
      exceptionMinutes: 0,
      citationCount: 0,
      aiCostVnd: 0,
    };
    const result = measureDrillKpis(filled);
    expect(result.KP01.doubleHoldCount).toEqual({ measured: true, value: 0 });
    expect(result.recommendation).toBe('none');
  });
});
