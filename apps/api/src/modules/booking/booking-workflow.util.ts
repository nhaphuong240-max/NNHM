export type WorkflowState = {
  id: string;
  label: string;
  terminal?: boolean;
};

export type WorkflowTransition = {
  from: string;
  to: string;
  label: string;
};

export type BookingWorkflowDefinition = {
  id: string;
  tenantId: string;
  name: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED';
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  publishedAt?: string;
};

export const DEFAULT_BOOKING_WORKFLOW: Omit<BookingWorkflowDefinition, 'id' | 'tenantId'> = {
  name: 'Standard booking flow',
  version: 1,
  status: 'DRAFT',
  states: [
    { id: 'DRAFT', label: 'Nháp' },
    { id: 'RESERVED', label: 'Giữ chỗ' },
    { id: 'DEPOSITED', label: 'Đã cọc' },
    { id: 'CONTRACTED', label: 'Hợp đồng' },
    { id: 'CLOSED', label: 'Chốt', terminal: true },
    { id: 'CANCELLED', label: 'Hủy', terminal: true },
  ],
  transitions: [
    { from: 'DRAFT', to: 'RESERVED', label: 'Giữ chỗ' },
    { from: 'RESERVED', to: 'DEPOSITED', label: 'Thu cọc' },
    { from: 'DEPOSITED', to: 'CONTRACTED', label: 'Ký HĐ' },
    { from: 'CONTRACTED', to: 'CLOSED', label: 'Chốt deal' },
    { from: 'RESERVED', to: 'CANCELLED', label: 'Hủy' },
  ],
};

export function validateWorkflow(def: BookingWorkflowDefinition): string[] {
  const ids = new Set(def.states.map((s) => s.id));
  const errors: string[] = [];
  for (const t of def.transitions) {
    if (!ids.has(t.from) || !ids.has(t.to)) errors.push(`invalid_transition_${t.from}_${t.to}`);
  }
  return errors;
}
