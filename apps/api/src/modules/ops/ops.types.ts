export const OPS_RUNBOOK = '/docs/runbooks/ops-console.md';

export const OPS_DEEP_LINKS = {
  stuckPayments: '/admin/payment-gateways',
  lockTtl: '/admin/bookings/replay',
  driftBlock: '/admin/moderation',
  reconcileMismatch: '/finance/reconciliation',
} as const;

export type OpsWidgetItem = {
  id: string;
  label: string;
  detail?: string;
};

export type OpsWidget = {
  id: 'stuckPayments' | 'lockTtl' | 'driftBlock' | 'reconcileMismatch';
  title: string;
  count: number;
  severity: 'ok' | 'warn' | 'alert';
  hint: string;
  deepLink: string;
  runbook: string;
  runbookAnchor: string;
  items: OpsWidgetItem[];
  metrics?: Record<string, number>;
};

export type OpsConsoleSnapshot = {
  widgets: OpsWidget[];
  healthy: boolean;
};
