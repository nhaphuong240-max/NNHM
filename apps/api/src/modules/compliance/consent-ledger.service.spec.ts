import { ConsentLedgerService } from './consent-ledger.service';

describe('ConsentLedgerService', () => {
  it('status exposes append-only module', () => {
    const svc = Object.create(ConsentLedgerService.prototype) as ConsentLedgerService;
    const status = svc.status();
    expect(status.appendOnly).toBe(true);
    expect(status.module).toBe('consent-ledger');
  });
});
