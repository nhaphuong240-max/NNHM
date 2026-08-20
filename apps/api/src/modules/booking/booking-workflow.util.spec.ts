import { DEFAULT_BOOKING_WORKFLOW, validateWorkflow } from './booking-workflow.util';

describe('booking-workflow.util', () => {
  it('validates default workflow', () => {
    const def = { id: 'bwf_test', tenantId: 'ten_dev_01', ...DEFAULT_BOOKING_WORKFLOW };
    expect(validateWorkflow(def)).toEqual([]);
  });
});
