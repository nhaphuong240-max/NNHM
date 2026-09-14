import { intentToTransactionType, parseTransactionType } from './search-transaction-type.util';

describe('search-transaction-type.util', () => {
  it('maps public intent to transactionType', () => {
    expect(intentToTransactionType('buy')).toBe('sale');
    expect(intentToTransactionType('rent')).toBe('rent');
    expect(intentToTransactionType('project')).toBe('project');
  });

  it('parses API transactionType', () => {
    expect(parseTransactionType('sale')).toBe('sale');
    expect(parseTransactionType('rent')).toBe('rent');
  });
});
